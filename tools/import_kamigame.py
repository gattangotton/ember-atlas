"""Import factual skill tables and their icons; never execute source-page code.

Python standard library only. Re-run with --refresh to fetch articles again.
The intermediate cache contains extracted facts, not copies of editorial articles.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import re
import sys
import time
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tools' / '.kamigame-cache'
OUT = ROOT / 'public' / 'data' / 'kamigame-embers.json'
INDEX = 'https://kamigame.jp/emberstoria/page/342107991497025045.html'
REFRESH = '--refresh' in sys.argv
KINDS = {'チャージ': 'charge', 'アクティブ': 'active', 'トリガー1': 'trigger1', 'トリガー2': 'trigger2', 'トリガー3': 'trigger3'}
MAX = {'charge': 7, 'active': 5, 'trigger1': 7, 'trigger2': 7, 'trigger3': 7}
ALIASES = {'吉備紫津乃': '紫津乃', '鵤美鈴': '美鈴', '朱天暁': '暁', '星吠えのヴァルト': 'ヴァルト',
           '月歌いのチモシー': 'チモシー', '爪撫でのニャマ': 'ニャマ', '鋼砕きのサバナ': 'サバナ',
           'シグルドリーヴァ': 'シグルド', 'グウィン=リン': 'グウィン', 'マエル=イッド': 'マエル',
           '銀光のライガ': 'ライガ', '大角のビランディ': 'ビランディ', '紫津乃[炎天]': '水着・紫津乃',
           'ウルファ[遊泳]': '水着・ウルファ', '闇酔いのエプレ': 'エプレ', '小夜守のシャオレイ': 'シャオレイ',
           'ニュクス[蒼炎]': '【蒼炎】ニュクス'}


class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    def find(self, tags):
        tags = set(tags.split(','))
        for child in self.children:
            if isinstance(child, Node):
                if child.tag in tags:
                    yield child
                yield from child.find(','.join(tags))

    def text(self):
        if self.tag == 'br' or 'partition' in self.attrs.get('class', '').split():
            return '\n'
        return ''.join(c if isinstance(c, str) else c.text() for c in self.children)


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.current = node

    def handle_endtag(self, tag):
        node = self.current
        while node.parent:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent

    def handle_data(self, data):
        self.current.children.append(data)


def clean(s):
    return re.sub(r'[ \t\r\f\v]+', ' ', unicodedata.normalize('NFKC', s)).strip()


def compact(s):
    return re.sub(r'\s', '', clean(s))


def fetch(url):
    if urlparse(url).hostname not in {'kamigame.jp', 'lh3.googleusercontent.com'}:
        raise ValueError('Unexpected source host: ' + url)
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'EmberAtlas-LocalDataImport/1.0'}), timeout=40) as response:
                return response.read(), response.headers.get('Content-Type', '')
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def image(node):
    img = next(node.find('img'), None)
    if not img:
        return None
    url = img.attrs.get('data-src') or img.attrs.get('src', '')
    if urlparse(url).hostname != 'lh3.googleusercontent.com':
        return None
    return {'url': url, 'alt': clean(img.attrs.get('alt', ''))}


def index_entries():
    path = CACHE / 'index.json'
    if path.exists() and not REFRESH:
        return json.loads(path.read_text(encoding='utf-8'))
    doc = Document(fetch(INDEX)[0].decode('utf-8')).root
    entries = []
    for table in doc.find('table'):
        headers = [compact(x.text()) for x in table.find('th')]
        if headers[:4] != ['キャラ', '出身世界', '属性', '得意兵種']:
            continue
        for tr in table.find('tr'):
            cells = list(tr.find('td'))
            if len(cells) != 4:
                continue
            link = next(cells[0].find('a'), None)
            if link:
                entries.append({'name': compact(link.text()), 'url': urljoin(INDEX, link.attrs['href']),
                                'world': compact(cells[1].text()), 'element': compact(cells[2].text()),
                                'troop': compact(cells[3].text()),
                                'icons': {k: image(c) for k, c in zip(['portrait', 'world', 'element', 'troop'], cells)}})
    if not entries:
        raise ValueError('Index table schema changed')
    path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding='utf-8')
    return entries


def parse_metric(line):
    line = clean(line)
    # Only accept an entire numeric field; never turn an ambiguous sentence into a stat.
    m = re.fullmatch(r'(?:([^:：]*?)[:：]\s*)?([+\-]?\d[\d,]*(?:\.\d+)?)\s*(%|秒|回|倍|部隊|体|m)?', line)
    if not m:
        # Core tables often omit a colon, e.g. 研究速度+5.0％.
        m = re.fullmatch(r'(.+?)([+\-]\d[\d,]*(?:\.\d+)?)\s*(%|秒|回|倍)?', line)
    if not m:
        m = re.fullmatch(r'(.+?[^\d.])([+\-]?\d[\d,]*(?:\.\d+)?)\s*(%|秒|回|倍)', line)
    if not m:
        return None
    label = (m[1] or '威力').strip()
    return {'name': label, 'value': float(m[2].replace(',', '')), 'unit': m[3] or ''}


def parse_lines(lines):
    metrics, issues, context = [], [], ''
    for line in lines:
        if line.startswith('※') or line.startswith(('候補', '倍化率', '自分の与ダメージ増加')) or line == '(2/3/4/5部隊)':
            continue
        if line == '敵が行軍速度低下時' or re.fullmatch(r'.+への威力', line):
            context = line
            continue
        attenuation = re.fullmatch(r'減衰率:([\d%/]+)(?:\(2/3/4/5部隊\))?', line)
        if attenuation:
            parts = attenuation[1].split('/')
            if len(parts) == 4:
                metrics.extend({'name': f'{i+2}部隊時の威力倍率', 'value': float(v.rstrip('%')), 'unit': '%'} for i, v in enumerate(parts))
                continue
        if '/' in line and line.count(':') > 1:
            parts = line.split('/')
            prefix = re.match(r'増幅Lv\.\d+', parts[0])
            expanded = [parts[0]] + [(prefix[0] if prefix else '') + p for p in parts[1:]]
            submetrics, subissues = parse_lines(expanded)
            metrics.extend(submetrics)
            issues.extend(subissues)
            continue
        duration = re.search(r'\((\d+(?:\.\d+)?)秒\)$', line)
        metric = parse_metric(line[:duration.start()] if duration else line)
        if metric:
            if context:
                metric['name'] = context + ' / ' + metric['name']
            metrics.append(metric)
            if duration:
                metrics.append({'name': metric['name'] + ' / 持続時間', 'value': float(duration[1]), 'unit': '秒'})
        else:
            issues.append(line[:240])
    return metrics, issues


def parse_article(entry):
    doc = Document(fetch(entry['url'])[0].decode('utf-8')).root
    title = next(doc.find('h1'), None)
    if not title or '評価とスキル' not in title.text():
        raise ValueError('Not an Ember skill article: ' + entry['url'])
    modified = None
    for script in doc.find('script'):
        if script.attrs.get('type') == 'application/ld+json':
            try:
                obj = json.loads(script.text())
                if isinstance(obj, dict) and obj.get('dateModified'):
                    modified = obj['dateModified']
            except ValueError:
                pass
    result = {**entry, 'parserVersion': 2, 'updatedAt': modified, 'retrievedAt': datetime.now(timezone.utc).isoformat(),
              'sourceStatus': 'updates-stopped' if '記事の更新を停止しています' in doc.text() else 'unknown',
              'skills': {}, 'coreRows': [], 'issues': []}
    section, heading, key = '', '', None
    for node in doc.find('h2,h3,table'):
        if node.tag == 'h2':
            section, key = compact(node.text()), None
        elif node.tag == 'h3':
            heading = clean(node.text())
        elif section.endswith('の基本情報'):
            headers = [compact(t.text()) for t in node.find('th')]
            if '初期レア' in headers:
                for label, cell in zip(headers, node.find('td')):
                    if label == '初期レア':
                        result['rarity'] = compact(cell.text())
                        result['icons']['rarity'] = image(cell)
        elif section.endswith('のスキル'):
            headers = [compact(t.text()) for t in node.find('th')]
            cls = node.attrs.get('class', '')
            level = re.search(r'_Lv(\d+)', cls)
            if headers and headers[0] in KINDS and level:
                key = KINDS[headers[0]]
                if key not in result['skills']:
                    text = clean(node.text())
                    target = 'multiple' if '範囲' in text else 'single' if '単体' in text else 'unknown'
                    shape = next((v for k, v in [('扇形', 'fan'), ('円形', 'circle'), ('長方形', 'rectangle')] if k in text), 'none' if target == 'single' else 'unknown')
                    result['skills'][key] = {'name': heading, 'icon': image(node), 'target': target, 'shape': shape,
                                            'extra': 'unknown', 'levels': {}, 'effects': []}
            elif key and level and headers and re.fullmatch(r'Lv\d+威力', headers[0]):
                lv = int(level[1])
                lines = [clean(t) for cell in node.find('td') for t in cell.text().splitlines() if clean(t)]
                metrics, issues = parse_lines(lines)
                for line in issues:
                    result['issues'].append({'skill': key, 'level': lv, 'type': 'unparsed', 'field': line})
                result['skills'][key]['levels'][str(lv)] = metrics
        elif section.endswith('のコアアビリティ'):
            for tr in node.find('tr'):
                cells = list(tr.find('td'))
                if len(cells) == 3:
                    metrics = [parse_metric(t) for t in cells[2].text().splitlines() if clean(t)]
                    result['coreRows'].append({'stage': compact(cells[0].text()), 'requiredTotal': compact(cells[1].text()),
                                               'effects': [m for m in metrics if m]})
    # A matching portrait is confined to the article's character evaluation section.
    for node in doc.find('img'):
        if compact(node.attrs.get('alt', '')) == entry['name']:
            url = node.attrs.get('src', '')
            if urlparse(url).hostname == 'lh3.googleusercontent.com':
                result['icons']['portrait'] = {'url': url, 'alt': entry['name']}
                break
    for key, skill in result['skills'].items():
        identities = list(dict.fromkeys((m['name'], m['unit']) for row in skill['levels'].values() for m in row))
        for name, unit in identities:
            values = []
            for lv in range(1, MAX[key] + 1):
                found = [m['value'] for m in skill['levels'].get(str(lv), []) if (m['name'], m['unit']) == (name, unit)]
                values.append(found[0] if len(found) == 1 else None)
                if len(found) > 1:
                    result['issues'].append({'skill': key, 'level': lv, 'type': 'duplicate-metric', 'field': name})
            effect = {'name': name, 'unit': unit, 'values': values}
            if all(v is not None for v in values) and len(set(values)) > 1:
                # An almost-linear row is a review candidate, never an automatic correction.
                candidates = [(values[j]-values[i])/(j-i) for i in range(len(values)) for j in range(i+1, len(values))]
                for step in candidates:
                    expected = [round(values[0]+step*i, 6) for i in range(len(values))]
                    mismatches = [i for i, (a, b) in enumerate(zip(values, expected)) if abs(a-b) > 1e-5]
                    if len(mismatches) == 1:
                        effect['review'] = '掲載数値の増分が一部不規則（掲載値を保持）'
                        result['issues'].append({'skill': key, 'type': 'irregular-step', 'field': name,
                                                 'level': mismatches[0]+1, 'value': values[mismatches[0]]})
                        break
            skill['effects'].append(effect)
    if not result['skills']:
        result['issues'].append({'type': 'no-skill-tables'})
    return result


def article(entry):
    path = CACHE / (entry['url'].rsplit('/', 1)[-1] + '.json')
    if path.exists() and not REFRESH:
        cached = json.loads(path.read_text(encoding='utf-8'))
        compound = any(':' in m['name'] for s in cached.get('skills', {}).values() for row in s['levels'].values() for m in row)
        if cached.get('parserVersion') == 2 and not compound:
            return cached
    result = parse_article(entry)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Article:', result['name'], len(result['skills']), 'skills;', len(result['issues']), 'issues', flush=True)
    time.sleep(.2)
    return result


def build_patterns(characters):
    exact, ratio = {}, {}
    for char in characters:
        for key, skill in char['skills'].items():
            for index, effect in enumerate(skill['effects']):
                values = effect['values']
                if effect.get('review') or any(v is None for v in values):
                    continue
                ref = {'character': char['name'], 'recordId': char.get('recordId'), 'skill': key, 'effectIndex': index,
                       'effect': effect['name'], 'sourceUrl': char['url']}
                exact.setdefault((effect['unit'], tuple(values)), []).append(ref)
                if values[0] and len(set(values)) > 1:
                    ratios = tuple(str(Fraction(str(v)) / Fraction(str(values[0]))) for v in values)
                    ratio.setdefault((effect['unit'], ratios), []).append(ref)
    patterns = []
    for kind, groups in [('exact', exact), ('ratio', ratio)]:
        for (unit, values), refs in groups.items():
            if len({r['character'] for r in refs}) < 2:
                continue
            digest = hashlib.sha256(json.dumps([kind, unit, values]).encode()).hexdigest()[:12]
            patterns.append({'id': 'kg-' + kind + '-' + digest, 'kind': kind, 'unit': unit, 'values': list(values),
                             'levelCount': len(values), 'characterCount': len({r['character'] for r in refs}), 'references': refs})
    return sorted(patterns, key=lambda p: (-p['characterCount'], p['id']))


def download_icon(icon):
    if not icon:
        return
    name = hashlib.sha256(icon['url'].encode()).hexdigest()[:20]
    directory = ROOT / 'public' / 'assets' / 'kamigame'
    directory.mkdir(exist_ok=True)
    existing = list(directory.glob(name + '.*'))
    if existing:
        icon['path'] = 'assets/kamigame/' + existing[0].name
        return
    data, mime = fetch(icon['url'])
    ext = '.png' if data.startswith(b'\x89PNG') else '.jpg' if data.startswith(b'\xff\xd8') else '.webp' if data[:4] == b'RIFF' and data[8:12] == b'WEBP' else None
    if not ext:
        raise ValueError('Unexpected image type: ' + mime)
    (directory / (name + ext)).write_bytes(data)
    icon['path'] = 'assets/kamigame/' + name + ext


def main():
    CACHE.mkdir(exist_ok=True)
    entries = index_entries()
    with ThreadPoolExecutor(max_workers=3) as pool:
        characters = list(pool.map(article, entries))
    catalog = json.loads((ROOT / 'public/data/catalog.json').read_text(encoding='utf-8'))
    mechanics = json.loads((ROOT / 'public/data/mechanics.json').read_text(encoding='utf-8'))
    local = [r for r in catalog['records'] + mechanics.get('extraRecords', []) if r['kind'] == 'characters']
    by_name = {compact(r['name']).replace('=', ''): r for r in local}
    for char in characters:
        match_name = ALIASES.get(char['name'], char['name'])
        match = by_name.get(compact(match_name).replace('=', ''))
        char['recordId'] = match['id'] if match else None
        char['databaseName'] = match['name'] if match else None
    icons = [i for char in characters for i in list(char['icons'].values()) + [s['icon'] for s in char['skills'].values()] if i]
    unique = {i['url']: i for i in icons}
    if '--no-icons' not in sys.argv:
        with ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(download_icon, unique.values()))
        for icon in icons:
            icon['path'] = unique[icon['url']]['path']
    patterns = build_patterns(characters)
    result = {'version': 1, 'source': '神ゲー攻略', 'indexUrl': INDEX, 'createdAt': datetime.now(timezone.utc).isoformat(),
              'policy': '掲載された数値のみ収録。成長パターンは観測値の一致から分類。未掲載値の推定補完なし。コア表は段階ごとの掲載値であり累積値として扱わない。',
              'characters': characters, 'patterns': patterns,
              'summary': {'articles': len(characters), 'matched': sum(bool(c['recordId']) for c in characters),
                          'skills': sum(len(c['skills']) for c in characters), 'icons': len(unique),
                          'exactPatterns': sum(p['kind'] == 'exact' for p in patterns), 'ratioPatterns': sum(p['kind'] == 'ratio' for p in patterns),
                          'issues': sum(len(c['issues']) for c in characters)}}
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result['summary'], ensure_ascii=False), flush=True)
    print('Unmatched:', json.dumps([c['name'] for c in characters if not c['recordId']], ensure_ascii=False), flush=True)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
