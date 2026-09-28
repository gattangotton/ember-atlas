"""Crop supplied screenshot and existing video still; originals remain unchanged.
Usage: python tools/refine_screenshot_assets.py <IMG_5688.PNG> <frame-20.jpg>
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'public'
screen = Image.open(sys.argv[1]).convert('RGB').resize((2048, 945))
video = Image.open(sys.argv[2]).convert('RGB').resize((1400, 646))
icons = [('火','fire',188,419),('土','earth',418,419),('水','water',648,419),
         ('光','light',1566,419),('闇','dark',1336,419),('雷','thunder',1107,755),
         ('歩兵','infantry',224,419),('統率','leader',1141,419),
         ('弓兵','archer',1372,419),('騎兵','cavalry',913,755)]
metadata = {}
for name, key, x, y in icons + [('風','wind',460,286)]:
    source = video if name == '風' else screen
    size = 30 if name == '風' else 38
    crop = source.crop((x-size//2,y-size//2,x+size//2,y+size//2)).resize((64,64),Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA',(72,72)); canvas.paste(crop,(4,4))
    canvas.save(root / f'assets/filters/{key}.png')
    metadata[name] = dict(path=f'assets/filters/{key}.png',source='DPTW4024.MP4 20s' if name=='風' else 'IMG_5688.PNG',center=[x,y],size=size)
(root/'data/filter-icons.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
catalog = json.loads((root/'data/catalog.json').read_text(encoding='utf-8'))
record = next(r for r in catalog['records'] if r['kind']=='characters' and r['name']=='エプレ')
box=(400,140,585,325)
screen.crop(box).resize((256,256),Image.Resampling.LANCZOS).save(root/f"assets/portraits/{record['id']}.jpg",quality=93)
p=root/'data/portraits.json'; portraits=json.loads(p.read_text(encoding='utf-8'))
portraits[record['id']]=dict(path=f"assets/portraits/{record['id']}.jpg",source='IMG_5688.PNG',crop=dict(width=2048,box=box))
p.write_text(json.dumps(portraits,ensure_ascii=False,indent=2),encoding='utf-8')
