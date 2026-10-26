-- Apply after 002. Keeps existing members, posts and attachments.
begin;
alter table ember_private.profiles add column if not exists avatar text not null default '';
create or replace function public.ember_api(action text, payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); profile ember_private.profiles; room uuid; room_role text; result jsonb; item ember_private.posts; attachment ember_private.files; revision_now bigint; token text; target uuid; post_id bigint; client uuid; byte_count bigint; mime_type text;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then perform ember_private.fail('ログインしてください。','PT401'); end if;
 if payload->>'actor' is distinct from me::text then perform ember_private.fail('ログインしているアカウントが変わりました。画面を開き直してください。','PT401'); end if;
 select * into profile from ember_private.profiles where id=me;
 if not found then perform ember_private.fail('アプリの管理者設定が未完了です。管理者向け設置手順を確認してください。'); end if;
 if action='session' then return jsonb_build_object('enabled',true,'csrf','','role',case when profile.site_admin then 'admin' else 'user' end,'user',jsonb_build_object('id',me,'login',(select email from auth.users where id=me),'name',profile.name,'site_admin',profile.site_admin,'avatar',profile.avatar)); end if;
 if action='profile-avatar' then
  if payload->>'avatar' is null or not (payload->>'avatar'=any(array['','hero-2','hero-3','hero-4','hero-5','hero-6','hero-7','hero-8','hero-9','hero-10','hero-11','hero-12','hero-13','hero-14','hero-15','hero-16','hero-17','hero-18','hero-19','hero-20','hero-21','hero-22','hero-23','hero-24','hero-25','hero-26','hero-27','hero-28','hero-29','hero-30','hero-31','hero-32','hero-33','hero-34','hero-35','hero-36','hero-37','hero-38','hero-39','hero-40','hero-41','hero-42','hero-43','hero-44','hero-45','hero-46','hero-47','hero-48','hero-49','hero-51','hero-54','hero-55','hero-56','hero-57','hero-58','hero-59','hero-60','hero-61','hero-62','hero-63','hero-64','hero-65','hero-66','hero-67','hero-68','hero-69','hero-70','hero-71','hero-72','hero-73','hero-75','hero-76','hero-81','hero-82'])) then perform ember_private.fail('一覧からアイコンを選んでください。','PT422'); end if;
  update ember_private.profiles set avatar=payload->>'avatar' where id=me;
  return jsonb_build_object('avatar',payload->>'avatar');
 end if;
 if action='record' then
  select jsonb_build_object('state',state,'revision',revision) into result from ember_private.records where user_id=me;
  return coalesce(result,'{"state":null,"revision":0}'::jsonb);
 elsif action='record-save' then
  perform ember_private.throttle(me,action,120);
  if jsonb_typeof(payload->'state') is distinct from 'object' or payload->'state'->>'version' is distinct from '1' or jsonb_typeof(payload->'state'->'profile') is distinct from 'object' or jsonb_typeof(payload->'state'->'progress') is distinct from 'object' or jsonb_typeof(payload->'state'->'custom') is distinct from 'array' or octet_length((payload->'state')::text)>2000000 then perform ember_private.fail('記録の形式が不正か、2MBの上限を超えています。','PT422'); end if;
  insert into ember_private.records(user_id) values(me) on conflict do nothing;
  select revision into revision_now from ember_private.records where user_id=me for update;
  if (payload->>'revision')::bigint is distinct from revision_now then perform ember_private.fail('別の端末で更新されています。','PT409'); end if;
  update ember_private.records set state=payload->'state',revision=revision+1 where user_id=me;
  return jsonb_build_object('revision',revision_now+1);
 elsif action='rooms' then
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'role',m.role,'quota_bytes',a.quota_bytes,'member_limit',a.member_limit,'used_bytes',(select coalesce(sum(bytes),0) from ember_private.files where alliance=a.id),'member_count',(select count(*) from ember_private.members where alliance=a.id)) order by a.name),'[]'::jsonb) into result from ember_private.alliances a join ember_private.members m on m.alliance=a.id where m.user_id=me;
  return jsonb_build_object('rooms',result);
 elsif action='join' then
  perform ember_private.throttle(me,action,10);
  return jsonb_build_object('id',ember_private.accept_invite(me,payload->>'invite'));
 elsif action='alliance-create' then
  if not profile.site_admin then perform ember_private.fail('全体管理者のみ操作できます。'); end if;
  perform 1 from ember_private.settings where id for update;
  if (select count(*) from ember_private.alliances)>=5 then perform ember_private.fail('試験版の同盟数上限（5）です。'); end if;
  insert into ember_private.alliances(name) values(trim(payload->>'name')) returning id into room;
  insert into ember_private.members values(room,me,'admin'); return jsonb_build_object('id',room);
 end if;
 -- Serialize authorization with membership changes for room mutations.
 if action not in ('posts','members') then perform 1 from ember_private.settings where id for update; end if;
 -- Resolve the room from server-owned records, never trust a caller's room for a post/file.
 if action in ('post-delete') then
  select * into item from ember_private.posts where id=(payload->>'post')::bigint; room:=item.alliance;
 elsif action in ('file-release') then
  select * into attachment from ember_private.files where id=(payload->>'file')::uuid; room:=attachment.alliance;
 else room:=(payload->>'alliance')::uuid; end if;
 select role into room_role from ember_private.members where alliance=room and user_id=me;
 if room_role is null then perform ember_private.fail('この同盟へのアクセス権限がありません。'); end if;
 if action='posts' then
  select coalesce(jsonb_agg(row_data order by id desc),'[]'::jsonb) into result from (
   select p.id,jsonb_build_object('id',p.id,'user_id',p.user_id,'parent',p.parent,'name',u.name,'avatar',u.avatar,'title',case when p.deleted then '削除された投稿' else p.title end,'body',case when p.deleted then '' else p.body end,'created_at',extract(epoch from p.created_at),'deleted',case when p.deleted then 1 else 0 end,'can_delete',not p.deleted and (p.user_id=me or room_role='admin'),'file_id',f.id,'path',f.path,'mime',f.mime) row_data
   from ember_private.posts p join ember_private.profiles u on u.id=p.user_id left join ember_private.files f on f.post=p.id and not p.deleted
   where p.alliance=room and p.kind=payload->>'kind' and (p.parent is not distinct from (payload->>'parent')::bigint) and (not payload?'before' or p.id<(payload->>'before')::bigint)
   order by p.id desc limit 50) s;
  return jsonb_build_object('posts',result);
 elsif action in ('file-reserve','post-create') then
  perform ember_private.throttle(me,action,30);
  client:=(payload->>'client_id')::uuid;
  if client is null then perform ember_private.fail('投稿IDがありません。','PT422'); end if;
  select * into item from ember_private.posts where user_id=me and client_id=client;
  if found then
   if item.alliance<>room then perform ember_private.fail('投稿IDは別の同盟で使用されています。'); end if;
   return jsonb_build_object('id',item.id,'complete',true);
  end if;
  perform 1 from ember_private.settings where id for update;
  select * into attachment from ember_private.files where user_id=me and client_id=client;
  if action='file-reserve' then
   if found then
    if attachment.alliance<>room then perform ember_private.fail('添付先が異なります。'); end if;
    return to_jsonb(attachment);
   end if;
   byte_count:=(payload->>'bytes')::bigint; mime_type:=payload->>'mime';
   if byte_count is null or byte_count<=0 or byte_count>(case when mime_type like 'image/%' then 5000000 else 20000000 end) or mime_type is null or mime_type not in ('image/webp','image/png','image/jpeg','video/mp4','video/webm') then perform ember_private.fail('画像は5MB、動画は20MBまでです。対応形式を確認してください。','PT422'); end if;
   -- Reserve the bucket maximum until finalization, including abandoned uploads.
   byte_count:=20000000;
   if (select coalesce(sum(bytes),0) from ember_private.files where alliance=room)+byte_count>(select quota_bytes from ember_private.alliances where id=room) or (select coalesce(sum(bytes),0) from ember_private.files)+byte_count>(select total_quota from ember_private.settings where id) then perform ember_private.fail('添付容量の上限に達しました。管理者にご相談ください。','PT413'); end if;
   if mime_type like 'video/%' then
    if (select count(*) from ember_private.video_usage where alliance=room and created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC')>=5 then perform ember_private.fail('動画は同盟全体で月5本までです。','PT413'); end if;
    insert into ember_private.video_usage(alliance,user_id,client_id) values(room,me,client) on conflict do nothing;
   end if;
   insert into ember_private.files(alliance,user_id,client_id,path,mime,bytes) values(room,me,client,room::text||'/'||gen_random_uuid()::text,mime_type,byte_count) returning * into attachment;
   return to_jsonb(attachment);
  end if;
  if attachment.id is not null and (attachment.alliance<>room or not exists(select 1 from storage.objects where bucket_id='alliance-media' and name=attachment.path and (metadata->>'size')::bigint between 1 and case when attachment.mime like 'image/%' then 5000000 else 20000000 end and metadata->>'mimetype'=attachment.mime)) then perform ember_private.fail('添付ファイルの保存を確認できません。再試行してください。','PT422'); end if;
  if payload->>'kind'='reply' then
   if not exists(select 1 from ember_private.posts where id=(payload->>'parent')::bigint and alliance=room and kind='board' and not deleted) then perform ember_private.fail('返信先が見つかりません。'); end if;
  elsif payload?'parent' then perform ember_private.fail('返信先の指定が不正です。','PT422'); end if;
  if coalesce(trim(payload->>'body'),'')='' and attachment.id is null then perform ember_private.fail('本文か添付ファイルを入力してください。','PT422'); end if;
  insert into ember_private.posts(alliance,user_id,client_id,kind,parent,title,body) values(room,me,client,payload->>'kind',(payload->>'parent')::bigint,coalesce(payload->>'title',''),coalesce(payload->>'body','')) returning id into post_id;
  update ember_private.files set post=post_id,bytes=(select (metadata->>'size')::bigint from storage.objects where bucket_id='alliance-media' and name=attachment.path) where id=attachment.id;
  return jsonb_build_object('id',post_id);
 elsif action='post-delete' then
  if item.user_id<>me and room_role<>'admin' then perform ember_private.fail('削除権限がありません。'); end if;
  update ember_private.posts set deleted=true,title='',body='' where id=item.id;
  select * into attachment from ember_private.files where post=item.id;
  return jsonb_build_object('file',attachment.id,'path',attachment.path);
 elsif action='file-release' then
  if attachment.user_id<>me and room_role<>'admin' then perform ember_private.fail('削除権限がありません。'); end if;
  if exists(select 1 from storage.objects where bucket_id='alliance-media' and name=attachment.path) or exists(select 1 from ember_private.posts where id=attachment.post and not deleted) then perform ember_private.fail('ファイル削除が未完了です。'); end if;
  delete from ember_private.files where id=attachment.id; return '{}'::jsonb;
 end if;
 if room_role<>'admin' then perform ember_private.fail('同盟管理者のみ操作できます。'); end if;
 if action='members' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'login','','role',m.role,'site_admin',p.site_admin) order by p.name),'[]'::jsonb) into result from ember_private.members m join ember_private.profiles p on p.id=m.user_id where m.alliance=room;
  return jsonb_build_object('members',result,'invites',(select coalesce(jsonb_agg(jsonb_build_object('token_hash',token_hash,'expires_at',extract(epoch from expires_at),'uses',uses,'max_uses',max_uses)),'[]'::jsonb) from ember_private.invites where alliance=room and not revoked and expires_at>now() and uses<max_uses),'cleanup',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'path',f.path)),'[]'::jsonb) from ember_private.files f left join ember_private.posts p on p.id=f.post where f.alliance=room and (p.deleted or (f.post is null and f.created_at<now()-interval '1 hour'))));
 elsif action='invite-create' then
  perform ember_private.throttle(me,action,20);
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  insert into ember_private.invites(token_hash,alliance,max_uses) values(encode(sha256(convert_to(token,'UTF8')),'hex'),room,(payload->>'max_uses')::int);
  return jsonb_build_object('token',token);
 elsif action='invite-revoke' then
  update ember_private.invites set revoked=true where alliance=room and token_hash=payload->>'token_hash'; return '{}'::jsonb;
 elsif action='member-update' then
  perform 1 from ember_private.settings where id for update; target:=(payload->>'user')::uuid;
  if payload->>'role' is null or payload->>'role' not in ('admin','member','remove') then perform ember_private.fail('権限の指定が不正です。','PT422'); end if;
  if not profile.site_admin and (payload->>'role'<>'remove' or exists(select 1 from ember_private.members where alliance=room and user_id=target and role='admin')) then perform ember_private.fail('サブ管理者の任命・解除は全体管理者のみ操作できます。'); end if;
  if target<>me and exists(select 1 from ember_private.profiles where id=target and site_admin) then perform ember_private.fail('全体管理者の権限は変更できません。'); end if;
  if exists(select 1 from ember_private.members where alliance=room and user_id=target and role='admin') and payload->>'role'<>'admin' and (select count(*) from ember_private.members where alliance=room and role='admin')<=1 then perform ember_private.fail('最後の同盟管理者は削除・降格できません。'); end if;
  if payload->>'role'='remove' then delete from ember_private.members where alliance=room and user_id=target;
  else update ember_private.members set role=payload->>'role' where alliance=room and user_id=target; end if;
  return '{}'::jsonb;
 elsif action='alliance-update' then
  if not profile.site_admin then perform ember_private.fail('全体管理者のみ操作できます。'); end if;
  byte_count:=(payload->>'quota_bytes')::bigint;
  if byte_count is null or byte_count<10000000 or byte_count>800000000 then perform ember_private.fail('容量は10〜800MBで指定してください。','PT422'); end if;
  update ember_private.alliances set quota_bytes=byte_count where id=room; return '{}'::jsonb;
 end if;
 perform ember_private.fail('未対応の操作です。','PT422'); return null;
end $$;


revoke all on function public.ember_api(text,jsonb) from public,anon;
grant execute on function public.ember_api(text,jsonb) to authenticated;
commit;
