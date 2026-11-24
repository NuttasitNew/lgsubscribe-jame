#!/usr/bin/env python3
"""Import a monthly LG Subscribe price-list PDF into data/price-list/current.json.

The staff price-list page (/price-list/) reads that JSON, so importing a new PDF
is the only step needed each month:

    pnpm import:price-list "/path/to/Price list_Dec.pdf"

Categories are detected from each page's heading, so page numbers may move
between months. Pages without a recognised heading (cover, combo, equipment
fees, examples, service areas) are skipped and listed in the summary.
"""
import ast
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/price-list/current.json'
IMAGE_DIR = ROOT / 'public/images/price-list'
IMAGE_URL = '/images/price-list'

# Shared cell/model parsers live in the August converter; load only those definitions.
_src = (ROOT / 'scripts/convert-price-list-aug-v3.py').read_text()
_wanted = {'norm_space', 'clean_cell', 'parse_money', 'looks_like_contract',
           'normalize_contract', 'extract_model_code', 'split_model', 'CONTRACT_RE', 'MODEL_TOKEN_RE'}
_nodes = [n for n in ast.parse(_src).body if
          (isinstance(n, ast.FunctionDef) and n.name in _wanted) or
          (isinstance(n, ast.Assign) and any(getattr(t, 'id', '') in _wanted for t in n.targets))]
exec(compile(ast.Module(body=_nodes, type_ignores=[]), '<shared-price-parsers>', 'exec'))
_extract_model_code = extract_model_code  # noqa: F821 (defined by exec)


def extract_model_code(text):  # noqa: F811
    if re.search(r'stage\s*501', text, re.I):
        return 'LG xboom STAGE501'
    return _extract_model_code(text)


def squash(text):
    """Heading text without spaces; the PDF font sometimes maps า to ำ."""
    return re.sub(r'\s+', '', unicodedata.normalize('NFC', text or '')).replace('ำ', 'า')


# Order matters: the first rule that matches a page heading wins.
SKIP_HEADINGS = ('อุปกรณ์', 'ส่วนเกิน', 'ตัวอย่าง', 'คอมโบ', 'Combo', 'เท่านั้น')
CATEGORY_RULES = [
    ('กรองน้', 'เครื่องกรองน้ำ'),
    ('ดูดฝุ', 'เครื่องดูดฝุ่น'),
    ('ตู้เย็น', 'ตู้เย็น'),
    ('WashTower', 'Wash Tower'),
    ('ซักผ้าและอบผ้า', 'เครื่องซักอบ'),
    ('งอบผ้', 'เครื่องอบผ้า'),
    ('ซัก', 'เครื่องซักผ้า'),
    ('กผ้า', 'เครื่องซักผ้า'),
    ('ล้างจาน', 'เครื่องล้างจาน'),
    ('ไมโครเวฟ', 'ไมโครเวฟ'),
    ('ลดความชื้น', 'เครื่องลดความชื้น'),
    ('ฟอกอากาศ', 'เครื่องฟอกอากาศ'),
    ('SAC', 'เครื่องปรับอากาศ SAC'),
    ('ปรับ', 'เครื่องปรับอากาศ RAC'),
    ('โทรทัศน์', 'โทรทัศน์'),
    ('มอนิเตอร์', 'จอมอนิเตอร์'),
    ('xboom', 'ลำโพง'),
    ('Soundbar', 'ซาวด์บาร์'),
]


def detect_category(page_text):
    lines = [squash(l) for l in page_text.splitlines() if l.strip()]
    joined = ''.join(lines[:3])
    if 'SAC' in ''.join(lines[:8]) and 'ปรับ' in joined:
        return 'เครื่องปรับอากาศ SAC'
    if any(s in joined for s in SKIP_HEADINGS):
        return None
    for key, category in CATEGORY_RULES:
        if key.lower() in joined.lower():
            return category
    return None


LAYOUTS = {
    'standard': ['sale', 'img', 'model', 'contract', 'cycle', 'price', 'promo', 'bill', 'discount', 'policy'],
    'sac': ['sale', 'img', 'model', 'contract', 'cycle', 'price', 'promo', 'discount', 'policy'],
    'nosale': ['img', 'model', 'contract', 'cycle', 'price', 'promo', 'bill', 'discount', 'policy'],
    'tv': ['sale', 'model', 'contract', 'advance', 'price', 'promo', 'bill', 'discount', 'policy'],
}


def layout_for(table):
    head = ' '.join(clean_cell(c) for c in table[0])  # noqa: F821
    if 'Advance' in head:
        return 'tv'
    if len(table[0]) == 10:
        return 'standard'
    return 'nosale' if not clean_cell(table[0][0]) else 'sac'  # noqa: F821


def is_contract(text):
    t = clean_cell(text).replace(' ', '')  # noqa: F821
    return looks_like_contract(text) and t not in {'NoService', 'No|Service'}  # noqa: F821


def parse_bills(text):
    """'รอบบิลที่ 1-9 (99) | รอบบิลที่ 10-84 (599)' → [{from, to, amount}]."""
    compact = re.sub(r'\s+', '', text or '').replace('ถึง', '-')
    bills = []
    for rng, amount in re.findall(r'(\d+(?:[-–~]\d+)?)\(([\d,.]+)\)', compact):
        parts = re.split(r'[-–~]', rng)
        start, end = int(parts[0]), int(parts[-1])
        value = parse_money(amount)  # noqa: F821
        if value is not None and 0 < start <= end <= 120:
            bills.append({'from': start, 'to': end, 'amount': value})
    return bills


def contract_months(contract):
    m = re.search(r'(\d+)Y', contract or '')
    return int(m.group(1)) * 12 if m else None


def clean_detail(text):
    text = (text or '').replace('รำคำ', 'ราคา')
    # Drop stray spaces before Thai combining marks left by PDF extraction.
    text = re.sub(r'\s+([ัิ-ฺ็-๎])', r'\1', text)
    parts = [p.strip(' •') for p in text.split('|')]
    return [p for p in parts if p and p not in {'(ทุกสี)'}]


THAI_MARK = r'[\u0e31\u0e33-\u0e3a\u0e47-\u0e4e]'


# Some pages use a font that renders า as ำ; real ำ also exists (ดำ, น้ำ), so only fix known words.
AM_WORDS = {'รำคำ': 'ราคา', 'ขำว': 'ขาว', 'เทำ': 'เทา', 'ขนำด': 'ขนาด', 'อำกำศ': 'อากาศ',
            'รำยกำร': 'รายการ', 'ระยะเวลำ': 'ระยะเวลา', 'บริกำร': 'บริการ', 'ผ้ำ': 'ผ้า', 'จำน': 'จาน'}


def fix_thai(text, am_is_aa):
    """Tidy text cropped by pdftotext: stray spaces before vowels/tones and mis-mapped า."""
    text = re.sub(r'[ \t]+(' + THAI_MARK + ')', r'\1', text)
    if am_is_aa:
        for wrong, right in AM_WORDS.items():
            text = text.replace(wrong, right)
    return text


def crop_text(pdf_path, number, bbox, am_is_aa):
    """Readable cell text: pdftotext keeps Thai glyph order that pdfplumber scrambles."""
    x0, top, x1, bottom = bbox
    out = subprocess.run(
        ['pdftotext', '-f', str(number), '-l', str(number), '-x', str(int(x0)), '-y', str(int(top)),
         '-W', str(int(x1 - x0) + 1), '-H', str(int(bottom - top) + 1), '-layout', str(pdf_path), '-'],
        capture_output=True, text=True, check=True).stdout
    lines = [re.sub(r'\s+', ' ', l).strip() for l in out.splitlines()]
    return [fix_thai(l, am_is_aa) for l in lines if l]


def image_slug(model):
    return re.sub(r'[^a-z0-9]+', '-', model.lower()).strip('-')


def product_image(page, model_box):
    """Largest photo left of / inside the model cell and within its rows (the PDF thumbnail)."""
    if not model_box:
        return None
    x0, top, x1, bottom = model_box
    candidates = [i for i in page.images
                  if (i['x1'] - i['x0']) >= 30 and (i['bottom'] - i['top']) >= 30
                  and (i['x0'] + i['x1']) / 2 < x1 and top - 2 <= (i['top'] + i['bottom']) / 2 <= bottom + 2]
    if not candidates:
        return None
    return max(candidates, key=lambda i: (i['x1'] - i['x0']) * (i['bottom'] - i['top']))


def save_image(page, img, slug):
    bbox = (max(img['x0'], 0), max(img['top'], 0), min(img['x1'], page.width), min(img['bottom'], page.height))
    picture = page.crop(bbox).to_image(resolution=220).original.convert('RGB')
    picture.thumbnail((480, 480))
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = IMAGE_DIR / f'{slug}.webp'
    picture.save(path, 'WEBP', quality=82)
    return f'{IMAGE_URL}/{path.name}'


THAI_MONTHS = {'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
               'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12}


def thai_date(day, month, year):
    return f'{int(year) - 543:04d}-{THAI_MONTHS[month]:02d}-{int(day):02d}'


def combo_promotions(pdf_path, pages):
    """Combo pages: discount % for extra units, per customer type and date range (Subscription only)."""
    combos = []
    date_re = re.compile(r'(\d{1,2})\s*(' + '|'.join(re.escape(m) for m in THAI_MONTHS) + r')\s*(\d{4})')
    rule_re = re.compile(r"(Exist|New) Customer[ ]+ตั้งแต่[ ]*(\d+)[ ]*เครื่อง\S*[ ]+(\d+(?:\.\d+)?)%[ ]+(COMBO[^\n]*?_DC\d+%)")
    for number in range(1, pages + 1):
        text = subprocess.run(['pdftotext', '-raw', '-f', str(number), '-l', str(number), str(pdf_path), '-'],
                              capture_output=True, text=True).stdout
        if 'COMBO_' not in text or 'Customer' not in text:
            continue
        dates = date_re.findall(text.replace(' ', ''))
        rules = rule_re.findall(text)
        if len(dates) < 2 or not rules:
            continue
        for kind, units, pct, name in rules:
            combos.append({'name': name, 'page': number, 'customer': 'existing' if kind == 'Exist' else 'new',
                           'minUnits': int(units), 'percent': float(pct),
                           'from': thai_date(*dates[0]), 'to': thai_date(*dates[1])})
    return combos


def main(pdf_path):
    pdf_path = Path(pdf_path).expanduser().resolve()
    if not pdf_path.exists():
        sys.exit(f'ไม่พบไฟล์ {pdf_path}')

    with tempfile.TemporaryDirectory() as tmp:
        layout = Path(tmp) / 'layout.txt'
        subprocess.run(['pdftotext', '-layout', str(pdf_path), str(layout)], check=True)
        pages = layout.read_text().split('\f')

    whole = '\n'.join(pages)
    period_match = re.search(r'โปรโมช\s*ั?\s*น\s*(\d{1,2}\s*\S+\s*[–-]\s*\d{1,2}\s*\S+\s*\d{4})', whole)
    period = re.sub(r'\s+', ' ', period_match.group(1)).replace('–', '-') if period_match else ''
    version_match = re.search(r'LGETH\s*｜\s*([\d.\s]+)', pages[0])
    version = re.sub(r'\s+', '', version_match.group(1)) if version_match else ''

    categories, skipped = {}, []
    images = {}
    side_text = {}
    if IMAGE_DIR.exists():
        for old in IMAGE_DIR.glob('*.webp'):
            old.unlink()
    rows = []
    with pdfplumber.open(pdf_path) as doc:
        for number, page in enumerate(doc.pages, 1):
            text = pages[number - 1] if number <= len(pages) else ''
            category = detect_category(text)
            if not category:
                skipped.append(number)
                continue
            categories[number] = category
            payment_line = next((l for l in text.splitlines() if '1st Payment' in l), '')
            advance_months = re.search(r'1st\s*Payment\s*(\d+)M', payment_line)
            terms = re.search(r'1st\s*Payment.*?\)', fix_thai(payment_line, True))
            am_is_aa = 'รำคำ' in text
            for found in page.find_tables():
                table = found.extract()
                if not table or not table[0]:
                    continue
                roles = LAYOUTS[layout_for(table)]
                records, model, model_lines, model_box, sale = [], '', [], None, ''
                for raw, row in zip(table[2:], found.rows[2:]):
                    cell = dict(zip(roles, (clean_cell(c) for c in raw)))  # noqa: F821
                    boxes = dict(zip(roles, row.cells))
                    if cell.get('model'):
                        model = cell['model']
                        model_box = boxes.get('model')
                        model_lines = crop_text(pdf_path, number, boxes['model'], am_is_aa) if boxes.get('model') else []
                    if cell.get('promo') and boxes.get('promo'):
                        cell['promo'] = ' | '.join(crop_text(pdf_path, number, boxes['promo'], am_is_aa))
                    if cell.get('sale') in {'Subscription', 'Outright'}:
                        sale = cell['sale']
                    if is_contract(cell.get('contract')):
                        records.append({**{k: [] for k in roles}, 'model': model, 'model_lines': model_lines, 'model_box': model_box,
                                        'sale': sale or 'Subscription', 'contract': cell['contract']})
                    if not records:
                        continue
                    for k, v in cell.items():
                        if v and k not in {'model', 'model_lines', 'model_box', 'sale', 'contract', 'img'} and v not in records[-1][k]:
                            records[-1][k].append(v)
                if roles is LAYOUTS['nosale']:
                    # Policy is a floating text box and promo cells span Visit+Self rows.
                    policies = [w['text'] for w in sorted(page.extract_words(), key=lambda w: w['top'])
                                if re.match(r'(VISIT|SELF)_', w['text'])]
                    if len(policies) == len(records):
                        for r, p in zip(records, policies):
                            r['policy'] = [p]
                    for prev, r in zip(records, records[1:]):
                        if not r['promo'] and prev['model'] == r['model']:
                            r['promo'] = prev['promo']
                for r in records:
                    j = lambda k: ' | '.join(r.get(k) or [])  # noqa: E731
                    code, detail = split_model(r['model'])  # noqa: F821
                    if code.startswith('WD516AN'):
                        code, detail = 'WD516AN / WD518AN', clean_cell(r['model'])  # noqa: F821
                    no_service = 'advance' in roles
                    contract = normalize_contract(r['contract'])  # noqa: F821
                    price = next((parse_money(v) for v in r['price'] if parse_money(v)), None)  # noqa: F821
                    if not code or price is None:
                        continue
                    bill_text = j('bill')
                    bills = parse_bills(bill_text)
                    outright = r['sale'] == 'Outright'
                    promo_price = None
                    if outright:
                        promo_price = next((parse_money(v) for v in r['bill'] if parse_money(v)), None)  # noqa: F821
                    slug = image_slug(code)
                    if slug not in side_text:
                        # Image column (left of the model cell): BTU, series, energy label…
                        box = r['model_box']
                        side_text[slug] = [l.strip(' •') for l in crop_text(pdf_path, number, (0, box[1], box[0], box[3]), am_is_aa)
                                           if re.search(r'[A-Za-z\u0e00-\u0e7f]', l)] if box and box[0] > 40 else []
                    if slug not in images:
                        found = product_image(page, r['model_box'])
                        images[slug] = save_image(page, found, slug) if found else None
                    rows.append({
                        'id': f"{number}-{len(rows) + 1}",
                        'page': number,
                        'category': category,
                        'saleType': r['sale'],
                        'model': code,
                        'details': list(dict.fromkeys([l.strip(' •') for l in r['model_lines']
                                    if l.strip(' •') and l.replace(' ', '') != code.replace(' ', '')
                                    and l not in {'NEW', '(ทุกสี)'} and 'Control Stock' not in l]
                                   + side_text[slug])),
                        'contract': contract,
                        'contractMonths': contract_months(contract),
                        'serviceCycle': 'No Service' if no_service else re.sub(r'\s+', ' ', j('cycle')).replace('ทุกๆ', 'ทุกๆ ').replace('  ', ' ').strip(),
                        'regularPrice': price,
                        'advancePayment': next((parse_money(v) for v in r.get('advance', []) if parse_money(v)), None),  # noqa: F821
                        'advanceMonths': int(advance_months.group(1)) if advance_months and not outright else None,
                        'paymentTerms': re.sub(r'\s+', ' ', terms.group(0)) if terms and not outright else '',
                        'promotion': [p.strip(' •') for p in j('promo').replace('รำคำ', 'ราคา').split('|') if p.strip(' •') not in {'', '-'}],
                        'bills': [] if outright else bills,
                        'promoPrice': promo_price,
                        'discount': next((parse_money(v) for v in r['discount'] if parse_money(v)), None),  # noqa: F821
                        'policy': re.sub(r'\s+', '', j('policy').replace(' | ', '')),
                        'image': images.get(slug),
                        'controlStock': 'Control Stock' in (r['model'] or '') or any('Control Stock' in l for l in r['model_lines']),
                    })

    if not rows:
        sys.exit('อ่านราคาไม่ได้เลย — รูปแบบ PDF อาจเปลี่ยน')

    # "(Control Stock)" is sometimes printed in the column header instead of the model cell
    # (Nov p.6 A9T-CORE): on a page with a single model, the header flag belongs to it.
    for number in sorted({r['page'] for r in rows}):
        on_page = [r for r in rows if r['page'] == number]
        if len({r['model'] for r in on_page}) != 1 or all(r['controlStock'] for r in on_page):
            continue
        text = subprocess.run(['pdftotext', '-layout', '-f', str(number), '-l', str(number), str(pdf_path), '-'],
                              capture_output=True, text=True, check=True).stdout
        if 'Control Stock' in text:
            for r in on_page:
                r['controlStock'] = True

    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {
        'source': pdf_path.name,
        'version': version,
        'period': period,
        'importedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'items': rows,
        'combos': combo_promotions(pdf_path, len(pages)),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')

    by_cat = {}
    for r in rows:
        by_cat.setdefault(r['category'], set()).add(r['model'])
    print(f'อ่าน {pdf_path.name}: {len(rows)} รายการราคา, {len({r["model"] for r in rows})} รุ่น, โปร {period or "-"}')
    for cat, models in by_cat.items():
        pages_of = sorted({r['page'] for r in rows if r['category'] == cat})
        print(f'  {cat}: {len(models)} รุ่น (หน้า {pages_of[0]}-{pages_of[-1]})')
    no_bills = [r for r in rows if r['saleType'] == 'Subscription' and not r['bills']]
    if no_bills:
        print(f'  ⚠ {len(no_bills)} รายการ Subscription ไม่มีโปร (ตารางผ่อนใช้ราคาปกติทั้งสัญญา):',
              ', '.join(sorted({r["model"] for r in no_bills}))[:300])
    no_image = sorted({r['model'] for r in rows if not r['image']})
    print(f'  รูปสินค้า: {len({r["model"] for r in rows}) - len(no_image)} รุ่น' + (f' · ไม่พบรูป: {", ".join(no_image)}' if no_image else ''))
    for c in data['combos']:
        print(f"  คอมโบ: {c['name']} ลด {c['percent']:g}% ({c['from']}–{c['to']}, หน้า {c['page']})")
    if not data['combos']:
        print('  ⚠ ไม่พบเงื่อนไขคอมโบ')
    print(f'  ข้ามหน้า: {", ".join(map(str, skipped))}')
    print(f'บันทึก {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('ใช้: pnpm import:price-list "<ไฟล์ PDF>"')
    main(sys.argv[1])
