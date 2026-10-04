"""Read local Unity cache assets; never launch or modify the game.
Requires UnityPy 1.25.3 (pip --target .local-tools/unitypy UnityPy==1.25.3).
"""
from pathlib import Path
import json, sys, re
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.local-tools/unitypy'))
import UnityPy

GAME=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'emberstoria/EMBERSTORIA_Data'
OUT=ROOT/'.work/game-images'
OUT.mkdir(parents=True,exist_ok=True)
locations=json.loads((ROOT/'.work/game-master/image-locations.json').read_text())
samples='--samples' in sys.argv
seen=set();report=[]
for row in locations:
    asset=row['asset']
    if '--enhancers' in sys.argv and '/Enhancer/' not in asset: continue
    if samples and not re.search(r'(Hero/(Portrait|Thumbnail|Icon)/00081|Equipment/LargeThumbnail/00247)\.png$',asset) and 'Thumbnail' not in asset.split('/')[-1]: continue
    files=[]
    for b in row['bundles']:
        if 'RuntimePath}' in b['id']:
            f=GAME/'StreamingAssets/aa'/b['id'].split('RuntimePath}')[1].lstrip('\\/').replace('\\','/')
        else:
            f=GAME/'Caches'/b['m_BundleName']/b['m_Hash']/'__data'
        if f.is_file(): files.append(str(f))
        elif 'RuntimePath}' not in b['id']:
            # The installed catalog can precede an updated downloaded bundle.
            # Same bundle identity only; exported asset paths are still checked.
            files.extend(str(p) for p in (GAME/'Caches'/b['m_BundleName']).glob('*/__data') if p.is_file())
    if not files: report.append({'asset':asset,'missing':True});continue
    signature=tuple(files)
    if signature in seen:continue
    seen.add(signature)
    try:
        env=UnityPy.load(*files)
        for name,obj in env.container.items():
            if obj.type.name not in ('Texture2D','Sprite'):continue
            if not re.search(r'(equipment/(largethumbnail|thumbnail)|hero/(portrait|thumbnail|icon)|building/(largethumbnail|thumbnail)|monster/(fullscreen|thumbnail)|enhancer/(fullscreen|thumbnail)|commander/[^/]+|soldier/[^/]+)/',name,re.I):continue
            data=obj.deref_parse_as_object();image=data.image
            parts=name.split('/');kind=parts[-3].lower();variant=parts[-2].lower();key=Path(name).stem
            dest=OUT/f'{kind}-{variant}-{key}.png'
            image.save(dest)
            report.append({'asset':name,'file':dest.name,'width':image.width,'height':image.height,'type':obj.type.name})
        for obj in env.objects:
            if obj.type.name=='SpriteAtlas' and 'Thumbnail' in (obj.peek_name() or ''):
                atlas=obj.parse_as_object()
                for ptr in atlas.m_PackedSprites:
                    sprite=ptr.deref_parse_as_object();im=sprite.image
                    dest=OUT/('atlas-'+atlas.m_Name+'-'+sprite.m_Name+'.png');im.save(dest)
                    report.append({'asset':asset,'atlas':atlas.m_Name,'name':sprite.m_Name,'file':dest.name,'width':im.width,'height':im.height})
            if obj.type.name not in ('Sprite','Texture2D'):continue
            name=obj.peek_name() or ''
            if not re.search(r'(rarity|grade|rank|thumbnail|frame)',name,re.I):continue
            data=obj.parse_as_object();image=data.image
            dest=OUT/('ui-'+re.sub(r'[^a-zA-Z0-9_-]','_',name)+'.png');image.save(dest)
            report.append({'asset':asset,'name':name,'file':dest.name,'width':image.width,'height':image.height,'type':obj.type.name})
    except Exception as e:report.append({'asset':asset,'error':str(e)})
    if len(seen)%25==0:print('bundles',len(seen),'images',len(report),flush=True)
(OUT/('samples.json' if samples else 'manifest.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Done',len(seen),'bundles;',len([r for r in report if 'file' in r]),'images;',len([r for r in report if 'missing' in r]),'missing;',len([r for r in report if 'error' in r]),'errors')
