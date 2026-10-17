"""Extract requested original textures from the local Unity cache, read only."""
from pathlib import Path
import sys,json,re,time
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.local-tools/unitypy'))
import UnityPy
GAME=Path.home()/'emberstoria/EMBERSTORIA_Data'
version=re.search(rb'\d{4}\.\d+\.\d+[abfp]\d+', (GAME/'globalgamemanagers').read_bytes()[:200])
if not version:raise RuntimeError('Could not verify local Unity version')
UnityPy.config.FALLBACK_UNITY_VERSION=version[0].decode()
OUT=ROOT/'.work/game-images';OUT.mkdir(exist_ok=True,parents=True)
targets={
 'hero/thumbnail/00082.png':'hero-thumbnail-00082.png',
 'hero/portrait/00082.png':'hero-portrait-00082.png',
 'equipment/largethumbnail/00108.png':'equipment-largethumbnail-00108.png',
 'enhancer/thumbnail/00078.png':'enhancer-thumbnail-00078.png',
 'enhancer/thumbnail/00079.png':'enhancer-thumbnail-00079.png',
 'enhancer/thumbnail/10018.png':'enhancer-thumbnail-10018.png',
}
found={};scanned=0;start=time.time()
if '--roadmap' in sys.argv:
 locations=json.loads((ROOT/'.work/roadmap-image-location.json').read_text())
 files=[p for row in locations for b in row['bundles'] for p in (GAME/'Caches'/b['m_BundleName']).glob('*/__data')]
else:
 files=list((GAME/'Caches').glob('*/*/__data'))
 files.sort(key=lambda p:p.stat().st_mtime,reverse=True)
for file in files:
 if '--roadmap' not in sys.argv and file.stat().st_size>2_500_000:continue
 try:
  env=UnityPy.load(str(file));scanned+=1
  for name,obj in env.container.items():
   lower=name.lower()
   key=next((k for k in targets if lower.endswith('/remote/'+k)),None)
   roadmap='/document/detail/' in lower and lower.endswith('/00574.png')
   if not key and not roadmap:continue
   if obj.type.name not in ('Texture2D','Sprite'):continue
   image=obj.deref_parse_as_object().image
   filename=targets[key] if key else 'roadmap-2026-08.png'
   image.save(OUT/filename)
   found[filename]={'asset':name,'file':filename,'width':image.width,'height':image.height,'cache':str(file.relative_to(GAME))}
   print(json.dumps(found[filename],ensure_ascii=False),flush=True)
  if len(found)==len(targets)+1:break
 except Exception:continue
 if scanned%1000==0:print('Scanned',scanned,'found',len(found),'seconds',round(time.time()-start),flush=True)
(OUT/('roadmap-manifest.json' if '--roadmap' in sys.argv else 'october-update-manifest.json')).write_text(json.dumps(found,ensure_ascii=False,indent=2),encoding='utf-8')
print('Done',scanned,'bundles,',len(found),'images,',round(time.time()-start),'seconds',flush=True)
