"""Read-only XLSX extraction. Never evaluates formulas or follows workbook instructions."""
import sys, json, hashlib, zipfile, datetime
from pathlib import Path
import xml.etree.ElementTree as ET
import openpyxl

SOURCE = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'data'
OUT.mkdir(parents=True, exist_ok=True)
w = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
raw = {}
summary = []
for s in w:
    rows = []
    for i, cells in enumerate(s.iter_rows(), 1):
        values = {}
        for j, c in enumerate(cells, 1):
            v = c.value
            if v is None: continue
            if isinstance(v, (datetime.datetime, datetime.date, datetime.time)): v = v.isoformat()
            if isinstance(v, (int, float)) and '%' in c.number_format:
                v = f'{round(v * 100, 6):g}%'
            values[openpyxl.utils.get_column_letter(j)] = v
        if values: rows.append({'row': i, 'cells': values})
    errors = [{'cell': f'{k}{r["row"]}', 'value': v} for r in rows for k,v in r['cells'].items() if isinstance(v,str) and v.startswith(('#DIV/0!', '#VALUE!', '#REF!', '#N/A', '#NAME?', '#NUM!', '#SPILL!'))]
    raw[s.title] = rows
    summary.append({'name':s.title, 'rows':len(rows), 'cells':sum(len(r['cells']) for r in rows), 'errors':len(errors), 'errorExamples':errors[:5]})

def ident(kind,name): return kind + '-' + hashlib.sha256(name.encode()).hexdigest()[:14]
def record(kind,name,fields,sheet,row):
    return {'id':ident(kind,name), 'kind':kind, 'name':name, **fields, 'source':{'sheet':sheet,'row':row}}

records = []
for r in raw['エンバースリスト']:
    c=r['cells']
    if r['row']>1 and c.get('D') and str(c.get('A','')).startswith('☆'):
        records.append(record('characters',c['D'],{'rarity':c.get('A',''), 'troop':c.get('B',''), 'element':c.get('C',''), 'charge':c.get('E',''), 'active':c.get('F',''), 'trigger1':c.get('G',''), 'trigger2':c.get('H',''), 'trigger3':c.get('I',''), 'ability':c.get('J',''), 'maximum':c.get('K',''), 'release':c.get('L',''), 'note':c.get('M','')}, 'エンバースリスト',r['row']))
for r in raw['コアアビ']:
    c=r['cells']
    if r['row']>1 and c.get('D') and str(c.get('A','')).startswith('☆'):
        records.append(record('abilities',c['D']+' / '+str(c.get('E','')),{'character':c['D'],'rarity':c.get('A',''),'troop':c.get('B',''),'element':c.get('C',''),'ability':c.get('E',''),'maximum':c.get('F','')},'コアアビ',r['row']))
for r in raw['対魔獣倍加スキル計算機']:
    c=r['cells']
    if c.get('BI') in ['武器','頭部','身体','脚部','装飾','装飾品','足部','胴体'] and c.get('BJ') and isinstance(c.get('BK'),(float,int)):
        records.append(record('equipment',c['BJ'],{'slot':c['BI'],'grades':[c.get(x) for x in ['BK','BL','BM','BN','BO','BP']], 'effect':c.get('BQ',''), 'note':c.get('BR','')},'対魔獣倍加スキル計算機',r['row']))

# Stable identity deduplication, preserving source disagreements for inspection.
seen={}; conflicts=[]
for r in records:
    if r['id'] in seen:
        conflicts.append({'id':r['id'],'source':r['source']})
    else: seen[r['id']]=r
records=list(seen.values())
training = {r['cells']['A']:{'order':r['cells'].get('B',''), 'note':r['cells'].get('C',''), 'source':{'sheet':'☆5育成','row':r['row']}} for r in raw['☆5育成'] if isinstance(r['cells'].get('A'),str) and 'C' in r['cells'] and 'B' in r['cells']}
for r in records:
    if r['kind']=='characters' and r['name'] in training: r['training']=training[r['name']]
manifest={'schemaVersion':1,'sourceFile':SOURCE.name,'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sheets':summary,'counts':{k:sum(r['kind']==k for r in records) for k in ['characters','equipment','abilities']},'duplicates':conflicts}
(OUT/'catalog.json').write_text(json.dumps({'manifest':manifest,'records':records},ensure_ascii=False),encoding='utf-8')
(OUT/'sheets.json').write_text(json.dumps(raw,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'sheets':len(summary),'counts':manifest['counts'],'errors':sum(s['errors'] for s in summary),'duplicates':len(conflicts),'sheetSummary':summary},ensure_ascii=False))
