#!/usr/bin/env python3
"""Extract October PDF and compare the saved workbook with September by exact SKU.

Requires pdfplumber/openpyxl. Never writes public images or website data.
"""
import ast
import copy
import json
import re
import subprocess
import unicodedata
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

import pdfplumber
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[1]
PDF = Path('/Users/nuttasit/Downloads/Price list_Oct.pdf')
PREVIOUS = ROOT / 'outputs/01a06a46-19cf-70b0-a5c0-724c99b0aeb2/Price list Sep_V4.xlsx'
OUT = ROOT / 'outputs/oct-2026'
OUT.mkdir(parents=True, exist_ok=True)
XLSX = OUT / 'Price list_Oct.xlsx'

# Reuse only generic parsers; August page maps and hard-coded facts are excluded.
source = ast.parse((ROOT / 'scripts/convert-price-list-aug-v3.py').read_text())
functions = {'norm_space', 'clean_cell', 'parse_money', 'looks_like_contract',
             'normalize_contract', 'extract_model_code', 'split_model',
             'parse_bill_prices', 'parse_standard_row', 'parse_tv_row'}
constants = {'CONTRACT_RE', 'MODEL_TOKEN_RE', 'BILL_PRICE_RE'}
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
    compact=re.sub(r'\s+','',text or '').replace('ถึง','-')
    pairs=re.findall(r'(\d+(?:[-–]\d+)?)\(([\d,.]+)\)',compact)
    pairs=[(a.replace('–','-'),b) for a,b in pairs]
    first=next((parse_money(b) for a,b in pairs if a=='1' or a.startswith('1-')),None)
    return {'ราคาโปร_รอบบิล1':first,'ช่วงราคาโปร':' | '.join(f'{a}={b}' for a,b in pairs),
        'ราคาโปร_หลังโปร':parse_money(pairs[-1][1]) if pairs else None}

subprocess.run(['pdftotext', '-layout', str(PDF), str(OUT / 'source-layout.txt')], check=True)
subprocess.run(['pdftotext', '-bbox-layout', str(PDF), str(OUT / 'source-bbox.html')], check=True)
pages = (OUT / 'source-layout.txt').read_text().split('\f')
ns = {'x': 'http://www.w3.org/1999/xhtml'}
bbox = ET.parse(OUT / 'source-bbox.html').findall('.//x:page', ns)
categories = {}
for start, end, category in [(3,4,'เครื่องกรองน้ำ'),(5,6,'เครื่องดูดฝุ่น'),
    (7,14,'ตู้เย็น'),(15,18,'Wash Tower'),(19,20,'เครื่องซักอบ'),
    (21,22,'เครื่องซักผ้าฝาหน้า'),(23,24,'เครื่องซักผ้าฝาบน'),
    (25,25,'เครื่องอบผ้า'),(26,27,'เครื่องล้างจาน'),(28,28,'ตู้ถนอมผ้า'),
    (29,29,'ไมโครเวฟ'),(30,33,'เครื่องลดความชื้น'),(34,38,'เครื่องฟอกอากาศ'),
    (39,48,'เครื่องปรับอากาศ RAC'),(51,52,'เครื่องปรับอากาศ SAC'),
    (55,60,'โทรทัศน์'),(61,62,'จอมอนิเตอร์'),(63,65,'ลำโพง'),(66,66,'ซาวด์บาร์')]:
    categories.update({p:category for p in range(start,end+1)})

rows = []
table_counts = {}
with pdfplumber.open(PDF) as doc:
    assert len(doc.pages) == 78
    for number, page in enumerate(doc.pages, 1):
        if number not in categories:
            continue
        tables = page.extract_tables()
        table_counts[number] = len(tables)
        for table in tables:
            count = len(table[0])
            if number == 4:
                # Text boxes overlap table lines; merge split subrows by contract.
                groups = []
                model = promo = ''
                for raw in table[2:]:
                    r = [clean_cell(c) for c in raw]
                    model = r[1] or model
                    promo = r[5] or promo
                    if looks_like_contract(r[2]):
                        groups.append({'model':model,'contract':r[2], 'cycle':r[3],
                            'price':None,'discount':None,'bill':[], 'promo':promo})
                    if groups:
                        g = groups[-1]
                        g['price'] = parse_money(r[4]) or g['price']
                        g['discount'] = parse_money(r[7]) or g['discount']
                        if r[6]: g['bill'].append(r[6])
                policy_lines = []
                for line in bbox[3].findall('.//x:line', ns):
                    text = ' '.join(w.text or '' for w in line)
                    if re.match(r'(VISIT|SELF)_', text):
                        policy_lines.append((float(line.attrib['yMin']), text))
                policies = [t for _, t in sorted(policy_lines)]
                assert len(groups) == len(policies) == 8
                for g, policy in zip(groups, policies):
                    model, detail = split_model(g['model'])
                    if model.startswith('WD516AN'): model = 'WD516AN / WD518AN'; detail = g['model']
                    bill = ' | '.join(g['bill'])
                    rows.append({'หน้า':4,'หมวดสินค้า':categories[4], 'แบบการขาย':'Subscription',
                        'รุ่น':model,'รายละเอียดรุ่น':detail,'รายการสัญญา':g['contract'],
                        'รอบบริการ':g['cycle'],'ราคาปกติต่อเดือน':g['price'],
                        'รายละเอียดโปรโมชัน':g['promo'],'ราคาโปร_ข้อความ':bill,
                        **parse_bill_prices(bill),'ส่วนลดจากราคาปกติ':g['discount'],'Policy':policy})
                continue
            tv = number >= 55
            model_index = 1 if tv else 2
            model = sale = ''
            for raw in table[2:]:
                r = [clean_cell(c) for c in raw]
                if len(r) != count: raise ValueError(f'Ragged table page {number}')
                if r[model_index]: model = r[model_index]
                else: r[model_index] = model
                if r[0] in {'Subscription','Outright'}: sale = r[0]
                elif not r[0]: r[0] = sale or 'Subscription'
                parsed = parse_tv_row(r) if tv else parse_standard_row(r, count)
                if not parsed: continue
                parsed.update({'หน้า':number,'หมวดสินค้า':categories[number]})
                rows.append(parsed)

assert all(r['รุ่น'] and r['ราคาปกติต่อเดือน'] is not None and r['Policy'] for r in rows)
assert set(r['หน้า'] for r in rows) == set(categories), 'Missing price-table pages'
controls = {'A9T-LITE.DCGPETH','GC-L257SFZW.APYPLMT','GC-L257KQKW.AEPPLMT','GC-B257SQYL.AMCPLMT'}
for r in rows:
    r['Policy']=re.sub(r'\s+','',r['Policy'])
    r['ระยะเวลาโปรโมชัน'] = '1-31 ต.ค. 2569'
    r['เงื่อนไขชำระ'] = clean_cell(next((l for l in pages[r['หน้า']-1].splitlines() if '1st Payment' in l), ''))
    r['หมายเหตุหน้า'] = 'Control Stock — ไม่ทำรูป' if r['รุ่น'] in controls else ''
    r['ผลเช็ค'] = 'ต้องถามเพิ่ม' if r['รุ่น']=='100MRGB96BS.ATM' else 'ตรง'
    if r['รุ่น']=='100MRGB96BS.ATM': r['หมายเหตุตอนเช็ค']='ประกาศปิดขายชั่วคราว แม้ยังมีราคาใน PDF'

wb = load_workbook(PREVIOUS)
ws = wb['รายการราคา']
headers = [c.value for c in ws[1]]
styles = [copy.copy(c._style) for c in ws[2]]
ws.delete_rows(2,ws.max_row)
ws.tables.clear()
ws.data_validations.dataValidation = []
for idx, r in enumerate(rows,2):
    ws.append([r.get(h) for h in headers])
    for c,s in zip(ws[idx],styles):c._style=copy.copy(s)
    ws.cell(idx,22,f'=IF(K{idx}="","ไม่มีราคาปกติ","")&IF(R{idx}="","ไม่มี Policy","")')
ws.auto_filter.ref = ws.dimensions
ws.freeze_panes = 'H2'
tab = Table(displayName='OctoberPrices',ref=ws.dimensions)
tab.tableStyleInfo=TableStyleInfo(name='TableStyleMedium2',showRowStripes=True)
ws.add_table(tab)
dv = DataValidation(type='list',formula1='"ตรง,ไม่ตรง,ต้องถามเพิ่ม"')
ws.add_data_validation(dv);dv.add(f'B2:B{ws.max_row}')

def replace_sheet(name, values):
    s=wb[name];s.delete_rows(2,s.max_row);s.tables.clear()
    for row in values:s.append(row)
    s.auto_filter.ref=s.dimensions
    for row in s.iter_rows(min_row=2):
        for c in row:c.alignment=Alignment(vertical='top',wrap_text=True)
    return s

replace_sheet('ภาพรวม',[
    ['ไฟล์ต้นทาง',str(PDF)],['เวอร์ชันเอกสาร','LGETH | 2026.10.01'],
    ['ระยะเวลาโปรโมชัน','1-31 ต.ค. 2569'],['จำนวนหน้า PDF',78],
    ['จำนวนแถวราคา',len(rows)],['จำนวนรุ่นไม่ซ้ำ',len({r['รุ่น'] for r in rows})],
    ['การเทียบเดือนก่อน','เทียบรหัสเต็ม + รายการสัญญา + รอบบริการ; ไม่จับคู่รุ่นคล้าย'],
    ['Control Stock','เก็บราคาเพื่ออ้างอิง แต่ไม่สร้างรูป'],
    ['ข้อขัดแย้ง OLED83C6','หน้า 53 ใช้ราคาเก่า 2999; ใช้ตารางหน้า 56 ราคา 2699'],
    ['34650A-B','รหัสในประกาศไม่ตรง 34U650A-B; ไม่จับคู่อัตโนมัติ']])
summary=[]
for category in dict.fromkeys(r['หมวดสินค้า'] for r in rows):
    rs=[r for r in rows if r['หมวดสินค้า']==category]
    summary.append([category,len(rs),len({r['รุ่น'] for r in rs}),min(r['ราคาปกติต่อเดือน'] for r in rs),max(r['ราคาปกติต่อเดือน'] for r in rs)])
ss=replace_sheet('สรุปตามหมวด',summary)
ss.delete_cols(6, max(0, ss.max_column-5))
for c,v in zip(ss[1],['หมวดสินค้า','จำนวนแถว','จำนวนรุ่น','ราคาปกติต่ำสุด','ราคาปกติสูงสุด']):c.value=v
ss.auto_filter.ref=ss.dimensions
replace_sheet('วิธีเช็ค',[
    [1,"เปิดชีท 'รายการราคา' แล้วใช้ Filter ที่แถวหัวตาราง"],
    [2,'เทียบรุ่น + รายการสัญญา + รอบบริการ + ราคาปกติ + Policy กับหน้า PDF'],
    [3,'ราคาปกติของ Subscription เป็นรายเดือน; Outright เป็นราคาซื้อขาด ให้กรองแบบการขายก่อนเทียบ'],
    [4,'ช่วงราคาโปรแยกรอบบิลตาม PDF; TV บางรุ่นมีทั้งส่วนลดโปรและการหักเงินล่วงหน้า'],
    [5,"เลือกผลเช็ค ตรง / ไม่ตรง / ต้องถามเพิ่ม และบันทึกค่าที่ต่างใน 'หมายเหตุตอนเช็ค'"],
    [6,'หน้า 1 = ปกโปร 1-31 ต.ค. 2569; เวอร์ชันเอกสาร 2026.10.01'],
    [7,'หน้า 53-54 เป็นตัวอย่าง Advance Payment; หน้า 67-75 เป็น Combo; หน้า 76-78 เป็นพื้นที่ติดตั้ง/บริการ'],
    [8,'Control Stock, รุ่นยกเลิกขาย และรุ่นปิดขายชั่วคราวไม่อยู่ในชุดรูป'],
    [9,'เทียบกันยายนจับคู่รหัสรุ่นเต็ม; ไม่พบรุ่นตรงให้ข้าม ไม่ใช้รุ่นใกล้เคียง'],
    [10,'ข้อความดิบทุกหน้าอยู่ในหมายเหตุท้ายหน้า; ราคาและระยะเวลาอาจเปลี่ยนตามประกาศบริษัท']])
wb['วิธีเช็ค'].tables.clear()
replace_sheet('Combo',[
    ['ระยะเวลา','1-31 ต.ค. 2569'],['ลูกค้าเก่า','ตั้งแต่ 1 เครื่อง ลด 10% ทุกรอบบิล'],
    ['ลูกค้าใหม่','ตั้งแต่ 2 เครื่อง ลด 10% ทุกรอบบิล'],
    ['เครื่องกรองน้ำ','ลด 15% เฉพาะเครื่องกรองน้ำ; สินค้าอื่นลด 10%'],
    ['Promotion ลูกค้าเก่า','OCT (COMBO)_(1 UNIT UP)_DC10%'],
    ['Promotion ลูกค้าใหม่','NEW OCT (COMBO)_(2 UNITS UP)_DC10%'],
    ['Promotion WP ลูกค้าเก่า','OCT (WP+COMBO)_( 1 UNIT UP)_DC10%_WP15%'],
    ['Promotion WP ลูกค้าใหม่','NEW OCT (WP+COMBO)_(2 UNITS UP)_DC10%_WP15%'],
    ['อ้างอิง','PDF หน้า 67-69; เงื่อนไขรายละเอียดเก็บในหมายเหตุท้ายหน้า']])
notes=wb['หมายเหตุท้ายหน้า']; notes.delete_rows(1,notes.max_row);notes.tables.clear()
notes.append(['หน้า','หมวด','ข้อความจาก PDF'])
for n,p in enumerate(pages[:78],1):
    notes.append([n,categories.get(n,'เงื่อนไข/อ้างอิง'),p.strip()])
policy=wb['Policy']; policy.delete_rows(1,policy.max_row);policy.tables.clear()
policy.append(['หน้า','ข้อความ Policy จาก PDF']);policy.append([2,pages[1].strip()])
for sheet in wb:
    for row in sheet:
        for c in row:
            if isinstance(c.value,str) and not c.value.startswith('='):
                c.value=c.value.replace('ก.ย.','ต.ค.').replace('1-30 ต.ค.','1-31 ต.ค.').replace('Sep_V4','Oct')
wb.save(XLSX)

# Compare after saving/reopening: the workbooks, not runtime TS, are authoritative.
def read_rows(path):
    s=load_workbook(path,data_only=True)['รายการราคา'];values=list(s.values)
    return [dict(zip(values[0],row)) for row in values[1:]]
prior=read_rows(PREVIOUS);current=read_rows(XLSX)
def group(rs):
    g={}
    for r in rs:
        if r['แบบการขาย']=='Subscription':g.setdefault(r['รุ่น'],[]).append(r)
    return g
before,after=group(prior),group(current)
assets=dict(re.findall(r'sourceFolder: "([^"]+)",\s*publicPath: "([^"]+)"',(ROOT/'lib/promotion-image-assets.ts').read_text()))
cancelled={'TX2315DT5G','WT2520NHEN','WT2116SHBB','85QNED80BSA','75NU855BPSA','65NU855BPSA','AS60GHWG0'}
paused={'OLED55C6PSA','100MRGB96BS'}
comparison=[];queue=[]
fields=['ราคาปกติต่อเดือน','เงินล่วงหน้า','ช่วงราคาโปร','Policy']
for model in dict.fromkeys([*after,*before]):
    old,new=before.get(model,[]),after.get(model,[])
    base=model.split('.')[0]
    def signature(rs):return sorted((str(r['รายการสัญญา']),re.sub(r'\s+','',r['รอบบริการ'] or ''),*[str(r.get(f) or '') for f in fields]) for r in rs)
    changed=bool(old and new and signature(old)!=signature(new))
    if model in controls:status='ข้าม: Control Stock'
    elif base in cancelled:status='ข้าม: ยกเลิกขาย'
    elif base in paused:status='ข้าม: ปิดขายชั่วคราว'
    elif not new:status='ข้าม: ไม่พบในเดือนใหม่'
    elif not old:status='ข้าม: ไม่มีรุ่นตรงในเดือนก่อน'
    else:status='แก้รูปเดิม' if changed else 'ใช้รูปเดิมได้เมื่อไม่ระบุเดือนเก่า'
    folder={'WD516AN / WD518AN':'WD516AN-WD518AN',
        'LG xboom Grab':'GRAB','LG xboom Bounce':'BOUNCE',
        'LG xboom STAGE301':'STAGE301','LG xboom STAGE501':'STAGE501'}.get(model,model)
    image=assets.get(folder)
    if image and not (ROOT/'public'/image.lstrip('/')).is_file():raise ValueError(f'Missing {image}')
    entry={'model':model,'status':status,'changed':changed,'previous':old,'current':new,
        'sourceImage':str(ROOT/'public'/image.lstrip('/')) if image else None}
    comparison.append(entry)
    if old and new and not status.startswith('ข้าม:'):
        if not image:raise ValueError(f'No exact image for {model}')
        queue.append(entry)
wb=load_workbook(XLSX)
s=wb.create_sheet('เทียบกันยายน')
s.append(['รุ่น','ผลการจับคู่','ราคาเดิมเริ่มต้น','ราคาใหม่เริ่มต้น','หน้า PDF ใหม่','รูปเดิม'])
for e in comparison:
    s.append([e['model'],e['status'],min((r['ราคาปกติต่อเดือน'] for r in e['previous']),default=None),
        min((r['ราคาปกติต่อเดือน'] for r in e['current']),default=None),
        ', '.join(str(p) for p in sorted({r['หน้า'] for r in e['current']})),e['sourceImage']])
s.freeze_panes='B2';s.auto_filter.ref=s.dimensions
for c in s[1]:c.font=Font(bold=True,color='FFFFFF');c.fill=PatternFill('solid',fgColor='A50034')
for col,width in zip('ABCDEF',[32,45,22,22,18,65]):s.column_dimensions[col].width=width
for row in s.iter_rows(min_row=2):
    for c in row:c.alignment=Alignment(wrap_text=True,vertical='top')
wb.save(XLSX)
(OUT/'comparison.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2))
(OUT/'image-queue.json').write_text(json.dumps(queue,ensure_ascii=False,indent=2))
print(json.dumps({'workbook':str(XLSX),'priceRows':len(rows),'models':len({r['รุ่น'] for r in rows}),
    'statusCounts':dict(Counter(e['status'] for e in comparison)), 'imageQueue':len(queue),
    'tablePages':table_counts},ensure_ascii=False))
