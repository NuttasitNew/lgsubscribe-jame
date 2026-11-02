#!/usr/bin/env python3
"""Extract November PDF into the October workbook layout and compare with October by exact SKU.

Requires pdfplumber/openpyxl. Never writes public images or website data.
"""
import ast
import copy
import re
import subprocess
import unicodedata
from collections import Counter
from pathlib import Path

import pdfplumber
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/nov-2026'
PDF = OUT / 'src/Price list_Nov.pdf'
PREVIOUS = ROOT / 'outputs/oct-2026/Price list_Oct.xlsx'
XLSX = OUT / 'Price list_Nov.xlsx'
PERIOD = '1-30 พ.ย. 2569'

source = ast.parse((ROOT / 'scripts/convert-price-list-aug-v3.py').read_text())
functions = {'norm_space', 'clean_cell', 'parse_money', 'looks_like_contract',
             'normalize_contract', 'extract_model_code', 'split_model'}
constants = {'CONTRACT_RE', 'MODEL_TOKEN_RE'}
nodes = [n for n in source.body if
         (isinstance(n, ast.FunctionDef) and n.name in functions) or
         (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in constants for t in n.targets))]
exec(compile(ast.Module(body=nodes, type_ignores=[]), '<shared-price-parsers>', 'exec'))
old_extract = extract_model_code
def extract_model_code(text):
    if re.search(r'stage\s*501', text, re.I):
        return 'LG xboom STAGE501'
    return old_extract(text)

def parse_bill_prices(text):
    # Thai diacritics are reordered in PDF extraction; numeric ranges are stable.
    compact = re.sub(r'\s+', '', text or '').replace('ถึง', '-')
    pairs = [(a.replace('–', '-'), b) for a, b in re.findall(r'(\d+(?:[-–]\d+)?)\(([\d,.]+)\)', compact)]
    first = next((parse_money(b) for a, b in pairs if a == '1' or a.startswith('1-')), None)
    return {'ราคาโปร_รอบบิล1': first, 'ช่วงราคาโปร': ' | '.join(f'{a}={b}' for a, b in pairs),
            'ราคาโปร_หลังโปร': parse_money(pairs[-1][1]) if pairs else None}

subprocess.run(['pdftotext', '-layout', str(PDF), str(OUT / 'source-layout.txt')], check=True)
pages = (OUT / 'source-layout.txt').read_text().split('\f')
categories = {}
for start, end, category in [(3,5,'เครื่องกรองน้ำ'),(6,6,'เครื่องดูดฝุ่น'),
    (7,12,'ตู้เย็น'),(13,15,'Wash Tower'),(16,17,'เครื่องซักอบ'),
    (18,21,'เครื่องซักผ้า'),(22,22,'เครื่องอบผ้า'),(23,24,'เครื่องล้างจาน'),
    (25,25,'ไมโครเวฟ'),(26,27,'เครื่องลดความชื้น'),(28,32,'เครื่องฟอกอากาศ'),
    (33,42,'เครื่องปรับอากาศ RAC'),(43,44,'เครื่องปรับอากาศ SAC'),
    (48,52,'โทรทัศน์'),(53,54,'จอมอนิเตอร์'),(55,57,'ลำโพง'),(58,58,'ซาวด์บาร์')]:
    categories.update({p: category for p in range(start, end + 1)})

# Column roles per table shape; page 4 drops the sale column, TV-type tables carry advance payment.
LAYOUTS = {
    'standard': ['sale', 'img', 'model', 'contract', 'cycle', 'price', 'promo', 'bill', 'discount', 'policy'],
    'sac': ['sale', 'img', 'model', 'contract', 'cycle', 'price', 'promo', 'discount', 'policy'],
    'nosale': ['img', 'model', 'contract', 'cycle', 'price', 'promo', 'bill', 'discount', 'policy'],
    'tv': ['sale', 'model', 'contract', 'advance', 'price', 'promo', 'bill', 'discount', 'policy'],
}

def layout_for(table):
    head = ' '.join(clean_cell(c) for c in table[0])
    if 'Advance' in head: return 'tv'
    if len(table[0]) == 10: return 'standard'
    return 'nosale' if not clean_cell(table[0][0]) else 'sac'

def is_contract(text):
    t = clean_cell(text).replace(' ', '')
    return looks_like_contract(text) and t not in {'NoService', 'No|Service'}

rows = []
with pdfplumber.open(PDF) as doc:
    assert len(doc.pages) == 73
    for number, page in enumerate(doc.pages, 1):
        if number not in categories:
            continue
        for table in page.extract_tables():
            roles = LAYOUTS[layout_for(table)]
            records, model, sale = [], '', ''
            for raw in table[2:]:
                cell = dict(zip(roles, (clean_cell(c) for c in raw)))
                model = cell.get('model') or model
                if cell.get('sale') in {'Subscription', 'Outright'}: sale = cell['sale']
                if is_contract(cell.get('contract')):
                    records.append({**{k: [] for k in roles}, 'model': model, 'sale': sale or 'Subscription',
                                    'contract': cell['contract']})
                if not records:
                    continue
                # Continuation subrows (split bill lines, "No Service") merge into the open record.
                for k, v in cell.items():
                    if v and k not in {'model', 'sale', 'contract', 'img'} and v not in records[-1][k]:
                        records[-1][k].append(v)
            if roles is LAYOUTS['nosale']:
                # Page 4: Policy is a floating text box and promo cells span Visit+Self rows.
                policies = [w['text'] for w in sorted(page.extract_words(), key=lambda w: w['top'])
                            if re.match(r'(VISIT|SELF)_', w['text'])]
                assert len(policies) == len(records), (number, policies)
                for r, p in zip(records, policies): r['policy'] = [p]
                for prev, r in zip(records, records[1:]):
                    if not r['promo'] and prev['model'] == r['model']: r['promo'] = prev['promo']
            for r in records:
                j = lambda k: ' | '.join(r.get(k) or [])
                code, detail = split_model(r['model'])
                if code.startswith('WD516AN'): code, detail = 'WD516AN / WD518AN', clean_cell(r['model'])
                tv = 'advance' in roles
                policy = re.sub(r'\s+', '', j('policy').replace(' | ', ''))
                rows.append({
                    'หน้า': number, 'หมวดสินค้า': categories[number],
                    'แบบการขาย': r['sale'], 'รุ่น': code, 'รายละเอียดรุ่น': detail,
                    'รายการสัญญา': ('No Service / ' if tv else '') + normalize_contract(r['contract']),
                    'รอบบริการ': 'No Service' if tv else j('cycle'),
                    'ราคาปกติต่อเดือน': next((parse_money(v) for v in r['price'] if parse_money(v)), None),
                    'เงินล่วงหน้า': next((parse_money(v) for v in r.get('advance', []) if parse_money(v)), None),
                    # Page 4's font maps า to ำ ("รำคำ"); the site parses "ราคา <first bill>" from this text.
                    'รายละเอียดโปรโมชัน': j('promo').replace('รำคำ', 'ราคา'), 'ราคาโปร_ข้อความ': j('bill'),
                    **parse_bill_prices(j('bill')),
                    'ส่วนลดจากราคาปกติ': next((parse_money(v) for v in r['discount'] if parse_money(v)), None),
                    'Policy': policy,
                })

missing = [r for r in rows if not (r['รุ่น'] and r['ราคาปกติต่อเดือน'] is not None and r['Policy'])]
assert not missing, missing[:3]
assert set(r['หน้า'] for r in rows) == set(categories), set(categories) - set(r['หน้า'] for r in rows)
# Marked "(Control Stock)" beside the model in the PDF (pages 6 and 11): priced, but no artwork.
controls = {'A9T-CORE.DCGPETH', 'GC-B257SQYL.AMCPLMT'}
assert pages[5].count('Control Stock') + pages[10].count('Control Stock') == len(controls)
for r in rows:
    r['หมายเหตุหน้า'] = 'Control Stock — ไม่ทำรูป' if r['รุ่น'] in controls else ''
    r['ระยะเวลาโปรโมชัน'] = PERIOD
    r['เงื่อนไขชำระ'] = clean_cell(next((l for l in pages[r['หน้า'] - 1].splitlines() if '1st Payment' in l), ''))
    r['ผลเช็ค'] = None

wb = load_workbook(PREVIOUS)
del wb['เทียบกันยายน']
ws = wb['รายการราคา']
headers = [c.value for c in ws[1]]
styles = [copy.copy(c._style) for c in ws[2]]
ws.delete_rows(2, ws.max_row)
ws.tables.clear()
ws.data_validations.dataValidation = []
for idx, r in enumerate(rows, 2):
    ws.append([r.get(h) for h in headers])
    for c, s in zip(ws[idx], styles): c._style = copy.copy(s)
    ws.cell(idx, 22, f'=IF(K{idx}="","ไม่มีราคาปกติ","")&IF(R{idx}="","ไม่มี Policy","")')
ws.auto_filter.ref = None
ws.freeze_panes = 'H2'
tab = Table(displayName='NovemberPrices', ref=ws.dimensions)
tab.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True)
ws.add_table(tab)
dv = DataValidation(type='list', formula1='"ตรง,ไม่ตรง,ต้องถามเพิ่ม"')
ws.add_data_validation(dv); dv.add(f'B2:B{ws.max_row}')

def replace_sheet(name, values):
    s = wb[name]; s.delete_rows(2, s.max_row); s.tables.clear()
    for row in values: s.append(row)
    s.auto_filter.ref = s.dimensions
    for row in s.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(vertical='top', wrap_text=True)
    return s

replace_sheet('ภาพรวม', [
    ['ไฟล์ต้นทาง', '/Users/nuttasit/Downloads/Price list_Nov.pdf'], ['เวอร์ชันเอกสาร', 'LGETH | 2026.10.30'],
    ['ระยะเวลาโปรโมชัน', PERIOD], ['Special Combo (Subscribe Day)', '12-30 พ.ย. 2569 (PDF หน้า 62-65)'],
    ['จำนวนหน้า PDF', 73], ['จำนวนแถวราคา', len(rows)], ['จำนวนรุ่นไม่ซ้ำ', len({r['รุ่น'] for r in rows})],
    ['การเทียบเดือนก่อน', 'เทียบรหัสเต็ม + รายการสัญญา + รอบบริการ; ไม่จับคู่รุ่นคล้าย (ชีท เทียบตุลาคม)']])
summary = []
for category in dict.fromkeys(r['หมวดสินค้า'] for r in rows):
    rs = [r for r in rows if r['หมวดสินค้า'] == category]
    summary.append([category, len(rs), len({r['รุ่น'] for r in rs}),
                    min(r['ราคาปกติต่อเดือน'] for r in rs), max(r['ราคาปกติต่อเดือน'] for r in rs)])
replace_sheet('สรุปตามหมวด', summary)
replace_sheet('วิธีเช็ค', [
    [1, "เปิดชีท 'รายการราคา' แล้วใช้ Filter ที่แถวหัวตาราง"],
    [2, 'เทียบรุ่น + รายการสัญญา + รอบบริการ + ราคาปกติ + Policy กับหน้า PDF (คอลัมน์ หน้า)'],
    [3, 'ราคาปกติของ Subscription เป็นรายเดือน; Outright เป็นราคาซื้อขาด ให้กรองแบบการขายก่อนเทียบ'],
    [4, 'ช่วงราคาโปรแยกรอบบิลตาม PDF; TV/จอ/ลำโพงมีเงินล่วงหน้าแยกคอลัมน์'],
    [5, "เลือกผลเช็ค ตรง / ไม่ตรง / ต้องถามเพิ่ม และบันทึกค่าที่ต่างใน 'หมายเหตุตอนเช็ค'"],
    [6, 'หน้า 45-47 ค่าอุปกรณ์ติดตั้งแอร์; 59-60 ตัวอย่าง Advance Payment; 61-73 Combo/พื้นที่บริการ (ดูหมายเหตุท้ายหน้า)'],
    [7, "ชีท 'เทียบตุลาคม' จับคู่รหัสรุ่นเต็มกับเดือนก่อน เพื่อดูว่ารูปไหนต้องแก้"]])
replace_sheet('Combo', [
    ['ระยะเวลา Combo ปกติ', PERIOD], ['Promotion ลูกค้าเก่า', 'COMBO_NOV_ADD_(1 UNIT UP)_DC10%'],
    ['Promotion ลูกค้าใหม่', 'COMBO_NOV_NEW_(2 UNITS UP)_DC10%'],
    ['Special Combo Subscribe Day', '12-30 พ.ย. 2569: COMBO_SUBSCRIBE DAY_ADD_(1 UNIT UP)_DC15% / COMBO_NEW_SUBSCRIBE DAY_(2 UNITS UP)_DC15%'],
    ['อ้างอิง', 'PDF หน้า 61-73; ข้อความเต็มอยู่ในชีท หมายเหตุท้ายหน้า']])
notes = wb['หมายเหตุท้ายหน้า']; notes.delete_rows(1, notes.max_row); notes.tables.clear()
notes.append(['หน้า', 'หมวด', 'ข้อความจาก PDF'])
for n, p in enumerate(pages[:73], 1):
    notes.append([n, categories.get(n, 'เงื่อนไข/อ้างอิง'), p.strip()])
policy = wb['Policy']; policy.delete_rows(1, policy.max_row); policy.tables.clear()
policy.append(['หน้า', 'ข้อความ Policy จาก PDF']); policy.append([2, pages[1].strip()])

# Exact-SKU comparison with October (Subscription only, matches the image workflow).
prior = list(load_workbook(PREVIOUS, data_only=True)['รายการราคา'].values)
prior = [dict(zip(prior[0], v)) for v in prior[1:]]
def group(rs):
    g = {}
    for r in rs:
        if r['แบบการขาย'] == 'Subscription': g.setdefault(r['รุ่น'], []).append(r)
    return g
fields = ['ราคาปกติต่อเดือน', 'เงินล่วงหน้า', 'ช่วงราคาโปร', 'Policy']
def value(v):
    return f'{v:g}' if isinstance(v, (int, float)) else str(v or '')
def signature(rs):
    return sorted((str(r['รายการสัญญา']), re.sub(r'\s+', '', r['รอบบริการ'] or ''),
                   *[value(r.get(f)) for f in fields]) for r in rs)
before, after = group(prior), group(rows)
s = wb.create_sheet('เทียบตุลาคม')
s.append(['รุ่น', 'ผลการจับคู่', 'ราคาเดิมเริ่มต้น', 'ราคาใหม่เริ่มต้น', 'หน้า PDF ใหม่', 'Policy ใหม่'])
statuses = Counter()
for model in dict.fromkeys([*after, *before]):
    old, new = before.get(model, []), after.get(model, [])
    if not new: status = 'ไม่พบในเดือนใหม่'
    elif not old: status = 'รุ่นใหม่ (ไม่มีในตุลาคม)'
    elif signature(old) != signature(new): status = 'ราคา/โปรเปลี่ยน — ต้องแก้รูป'
    else: status = 'เหมือนเดิม — ใช้รูปเดิมได้ถ้าไม่ระบุเดือน'
    statuses[status] += 1
    s.append([model, status, min((r['ราคาปกติต่อเดือน'] for r in old), default=None),
              min((r['ราคาปกติต่อเดือน'] for r in new), default=None),
              ', '.join(str(p) for p in sorted({r['หน้า'] for r in new})),
              ' / '.join(dict.fromkeys(r['Policy'] for r in new))])
s.freeze_panes = 'B2'; s.auto_filter.ref = s.dimensions
for c in s[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='A50034')
for col, width in zip('ABCDEF', [32, 40, 18, 18, 14, 60]): s.column_dimensions[col].width = width
wb.save(XLSX)
print({'workbook': str(XLSX), 'priceRows': len(rows), 'models': len({r['รุ่น'] for r in rows}),
       'perCategory': dict(Counter(r['หมวดสินค้า'] for r in rows)), 'vsOctober': dict(statuses)})
