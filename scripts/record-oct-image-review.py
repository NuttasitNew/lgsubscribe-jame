#!/usr/bin/env python3
"""Record visually checked ImageGen results without changing the generated image."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
plan_path=root/'outputs/oct-2026/image-plan.json'
plan=json.loads(plan_path.read_text())
updates=json.loads(sys.argv[1])
for update in updates:
    entry=next(e for e in plan if e['model']==update['model'])
    source=Path(update['generated'])
    with Image.open(source) as image:
        assert image.size==(1254,1254), (entry['model'],image.size)
        image.verify()
    shutil.copy2(source,entry['destination'])
    entry['status']='generated_verified'
    entry['review']='Visually checked model, price, October billing/promotion text and preservation of source composition.'
    entry['sha256']=hashlib.sha256(Path(entry['destination']).read_bytes()).hexdigest()
plan_path.write_text(json.dumps(plan,ensure_ascii=False,indent=2))
print(f'Recorded {len(updates)} visually verified images')
