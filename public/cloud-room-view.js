export const roomCanManage=(user,room)=>!!room&&(!!user.site_admin||room.role==='admin');
export const roomCanChangeMember=(user,member,role)=>!member.site_admin&&(user.site_admin||role==='remove'&&member.role!=='admin');
export const chronological=posts=>[...posts].sort((a,b)=>Number(a.id)-Number(b.id));
export const ownMessage=(post,user)=>String(post.user_id||post.author_id||'')===String(user.id);
export const boardMode=kind=>kind==='chat'?'chat':'board';
