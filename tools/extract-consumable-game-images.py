from pathlib import Path
import sys,json
root=Path.cwd();sys.path.insert(0,str(root/'.local-tools/unitypy'))
import UnityPy
base=Path.home()/'emberstoria/EMBERSTORIA_Data';out=root/'public/assets/game/consumable';out.mkdir(exist_ok=True,parents=True)
rows=json.loads((root/'.work/game-master/consumable-image-locations.json').read_text());report=[];seen=set()
for row in rows:
 if '/Consumable/Thumbnail/' not in row['asset']:continue
 files=[]
 for b in row['bundles']:
  f=base/'Caches'/b['m_BundleName']/b['m_Hash']/'__data'
  if f.is_file():files.append(str(f))
  else:files.extend(str(p) for p in (base/'Caches'/b['m_BundleName']).glob('*/__data'))
 if not files:report.append({'asset':row['asset'],'missing':True});continue
 sig=tuple(files)
 if sig in seen:continue
 seen.add(sig)
 env=UnityPy.load(*files)
 for name,obj in env.container.items():
  if '/consumable/thumbnail/' not in name.lower() or obj.type.name not in ('Texture2D','Sprite'):continue
  img=obj.deref_parse_as_object().image;dest=out/(Path(name).stem+'.png');img.save(dest)
  report.append({'asset':name,'file':dest.name,'width':img.width,'height':img.height})
(root/'artifacts/consumable-images-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('extracted',len([r for r in report if 'file' in r]),'missing',len([r for r in report if 'missing' in r]))
