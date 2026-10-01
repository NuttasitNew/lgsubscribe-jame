#!/usr/bin/env python3
"""Generate October campaign data from the workbook and synced, reviewed assets.

Requires openpyxl. Run after syncing Price list_Oct with --used-only.
"""
import json
import re
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
sheet = load_workbook(ROOT / 'data/Price list_Oct.xlsx', data_only=True)['รายการราคา']
values = list(sheet.values)
rows = [dict(zip(values[0], row)) for row in values[1:]]
assets = re.findall(r'sourceFolder: "([^"]+)"', (ROOT / 'lib/promotion-image-assets.ts').read_text())
aliases = {'WD516AN-WD518AN': 'WD516AN / WD518AN', 'GRAB': 'LG xboom Grab',
           'BOUNCE': 'LG xboom Bounce', 'STAGE301': 'LG xboom STAGE301'}
models = {aliases.get(asset, asset) for asset in assets}
groups = {}
for row in rows:
    if row['แบบการขาย'] == 'Subscription' and row['รุ่น'] in models:
        groups.setdefault(row['รุ่น'], []).append(row)
assert set(groups) == models, 'Every published asset must match an exact workbook model'
products = []
for model, contracts in groups.items():
    first = contracts[0]
    assert not any('Control Stock' in (row['หมายเหตุหน้า'] or '') for row in contracts)
    products.append({'model': model, 'category': first['หมวดสินค้า'],
                     'details': first['รายละเอียดรุ่น'], 'sourcePage': first['หน้า'],
                     'monthlyPrice': min(row['ราคาปกติต่อเดือน'] for row in contracts),
                     'promotions': list(dict.fromkeys(row['รายละเอียดโปรโมชัน'] for row in contracts
                                                     if row['รายละเอียดโปรโมชัน'] not in {None, '-'}))})
contents = '''/** Generated from data/Price list_Oct.xlsx by scripts/generate-oct-campaign-data.py.
 * Only exact models with reviewed October assets are published. Period: 1–31 October 2026.
 */
export type OctSubscriptionCampaignProduct = {
  model: string;
  category: string;
  details: string;
  sourcePage: number;
  monthlyPrice: number;
  promotions: readonly string[];
};

export const octSubscriptionCampaignProducts = ''' + json.dumps(products, ensure_ascii=False, indent=2) + ' as const satisfies readonly OctSubscriptionCampaignProduct[];\n'
(ROOT / 'lib/oct-subscription-campaign.ts').write_text(contents)
print(f'Generated {len(products)} exact October campaign models')
