"""Crop approved game artwork from locally extracted 1600px video frames.

Inputs: .work/equipment-sep28/{video}/{frame:03}.jpg (fps=1/3),
or {video}/seconds/{frame:03}.jpg (fps=1). Only the icon enters public/.
"""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
rows=[r.split('|') for r in (root/'tools/equipment-g1-sep28.txt').read_text(encoding='utf8').splitlines() if r and not r.startswith('#')]
out=root/'public/assets/portraits';out.mkdir(exist_ok=True,parents=True)
for g,f,*_ in rows:
 src=root/f'.work/equipment-sep28/{g}'/(f'seconds/{int(f[1:]):03}.jpg' if f.startswith('s') else f'{int(f):03}.jpg')
 if (g,f)==('1','2'):src=root/'.work/equipment-sep28/1/seconds/004.jpg'
 # The notification only covers the background above these four items.
 top=86 if (g,f) in {('1','28'),('3','1'),('4','5'),('4','s015')} else 72
 im=Image.open(src).crop((818,top,934,176))
 im.save(out/f'equipment-sep28-{g}-{f}.jpg',quality=94)
for g in range(1,6):
 group=[r for r in rows if int(r[0])==g];sheet=Image.new('RGB',(800,((len(group)+5)//6)*145),'white');d=ImageDraw.Draw(sheet)
 for i,(_,f,*_) in enumerate(group):
  x=i%6*133;y=i//6*145;sheet.paste(Image.open(out/f'equipment-sep28-{g}-{f}.jpg'),(x,y+22));d.text((x+3,y+3),f'{g}/{f}',fill='black')
 sheet.save(root/f'.work/equipment-sep28/crops-{g}.jpg')
print('Cropped',len(rows),'equipment icons')
