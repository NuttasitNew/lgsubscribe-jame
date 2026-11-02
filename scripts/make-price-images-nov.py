#!/usr/bin/env python3
"""Build the November canonical promotion stills from last month's set.

Unchanged models copy last month's still. Changed models are edited by Codex CLI
image generation, then only the edited region (the red hanging tag) is pasted
back onto the original so the rest of the image stays pixel-identical.

Usage: python scripts/make-price-images-nov.py [MODEL ...]   # no args = all EDITS
Requires pillow/numpy/openpyxl and a logged-in `codex` CLI.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from openpyxl import load_workbook
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PREVIOUS_SET = ROOT / '.gen/Price list_Oct/used'
PREVIOUS_SUFFIX = '__Price-list_Oct.png'
TARGET_SET = ROOT / '.gen/Price list_Nov/unused'
TARGET_SUFFIX = '__Price-list_Nov.png'
WORK = ROOT / '.gen/nov_2026'
WORKBOOK = ROOT / 'outputs/nov-2026/Price list_Nov.xlsx'
FOLDERS = {'WD516AN / WD518AN': 'WD516AN-WD518AN', 'LG xboom Grab': 'GRAB', 'LG xboom Bounce': 'BOUNCE',
           'LG xboom STAGE301': 'STAGE301', 'LG xboom STAGE501': 'STAGE501'}

# Folder -> (source still, change on the red hanging tag). Reviewed against the November workbook.
EDITS = {
    'GN-F392PQAK.AEPPLM1': (None, "the last line 'อีก 2 รอบบิล' must become 'อีก 11 รอบบิล'"
                           " (keep 'promotion', 'บิลแรก', '149.-', 'ลด 50%')"),
    'GV-B25FFGDB.ABMPLMT': (None, "below the existing 'บิลแรก 149.-', add a thin white dashed divider and two new"
                           " lines 'ลด 50%' and 'อีก 11 รอบบิล' in the same white font; make the red tag taller"
                           " downward just enough to fit them, keep its top, rope, width and style"),
    'GRAB': (None, "the last line '6 รอบบิลแรก' must become '24 รอบบิลแรก' (keep 'promotion', 'ลด 50%')"),
    'STAGE301': (None, "the last line '6 รอบบิลแรก' must become '24 รอบบิลแรก' (keep 'promotion', 'ลด 50%')"),
    'OLED55C6PSA.ATM': (ROOT / 'public/images/products/promotions/sep-v4/oled55c6psa-atm__price-list-sep-v4.png',
                        "the last line '12 รอบบิลแรก' must become '6 รอบบิลแรก' (keep 'promotion', 'ลด 50%')"),
    '100MRGB96BS.ATM': (ROOT / '.gen/sep_v4/100MRGB96BS.ATM-sep_v4.png',
                        "the last line '12 รอบบิลแรก' must become '6 รอบบิลแรก' (keep 'promotion', 'ลด 50%')"),
}
# Folder -> older still that already matches this month exactly (model absent from last month's set).
REUSE = {'STAGE501': ROOT / '.gen/sep_v4/LG xboom STAGE501-sep_v4.png'}

PROMPT = """Use your image generation tool to EDIT the attached image (do not redesign it).
The output must look identical to the input: same product photo, layout, fonts, colors, background and
every other text, same square size. Make exactly one change, inside the red hanging promotion tag
at the top-left area: {change}.
Do not touch the price box at the bottom-right or any other text.
After generating, copy the resulting PNG to {out} and print that path. Do not modify any other file."""


def folder_for(model):
    return FOLDERS.get(model, model)


def tag_mask(*images):
    """Red hanging-tag region (union across images, so a taller tag is covered), feathered."""
    red = np.zeros(images[0].size[::-1], bool)
    for image in images:
        a = np.asarray(image).astype(int)
        red |= (a[..., 0] > 170) & (a[..., 1] < 70) & (a[..., 2] < 70)
    red[500:] = False  # the tag lives in the top band; the price box and footer are below
    ys, xs = np.where(red)
    box = (xs.min() - 10, ys.min() - 10, xs.max() + 10, ys.max() + 10)
    mask = Image.new('L', images[0].size, 0)
    mask.paste(255, box)
    return mask.filter(ImageFilter.GaussianBlur(3)), box


def edit(folder):
    source, change = EDITS[folder]
    source = source or PREVIOUS_SET / folder / f'{folder}{PREVIOUS_SUFFIX}'
    raw = WORK / f'{folder}-codex.png'
    raw.unlink(missing_ok=True)
    prompt = PROMPT.format(change=change, out=raw)
    subprocess.run(['codex', 'exec', '-s', 'workspace-write', '-C', str(ROOT), '--skip-git-repo-check',
                    '-i', str(source), '-'], input=prompt, text=True, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert raw.is_file(), f'Codex produced no image for {folder}'
    src = Image.open(source).convert('RGB')
    gen = Image.open(raw).convert('RGB')
    if gen.size != src.size:
        gen = gen.resize(src.size, Image.LANCZOS)
    mask, box = tag_mask(src, gen)
    out = Image.composite(gen, src, mask)
    target = TARGET_SET / folder / f'{folder}{TARGET_SUFFIX}'
    target.parent.mkdir(parents=True, exist_ok=True)
    out.save(target)
    out.crop((0, 0, min(src.width, box[2] + 120), min(src.height, box[3] + 60))).save(WORK / f'{folder}-tag.png')
    return {'folder': folder, 'status': 'edited', 'source': str(source), 'tagBox': [int(v) for v in box]}


def main():
    values = list(load_workbook(WORKBOOK, data_only=True)['รายการราคา'].values)
    models = dict.fromkeys(dict(zip(values[0], v))['รุ่น'] for v in values[1:]
                           if dict(zip(values[0], v))['แบบการขาย'] == 'Subscription')
    WORK.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    report = []
    for model in models:
        folder = folder_for(model)
        if only and folder not in only:
            continue
        if folder in EDITS:
            print('editing', folder, flush=True)
            report.append(edit(folder))
            continue
        previous = REUSE.get(folder, PREVIOUS_SET / folder / f'{folder}{PREVIOUS_SUFFIX}')
        if not previous.is_file():
            report.append({'folder': folder, 'status': 'missing: no previous still'})
            continue
        target = TARGET_SET / folder / f'{folder}{TARGET_SUFFIX}'
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(previous, target)
        report.append({'folder': folder, 'status': 'reused'})
    if only and (WORK / 'report.json').is_file():
        # Partial rerun: replace only the rerun folders in the full report.
        report += [r for r in json.loads((WORK / 'report.json').read_text()) if r['folder'] not in only]
    (WORK / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    for r in report:
        if r['status'] != 'reused':
            print(r['folder'], r['status'])
    print({s: sum(r['status'] == s for r in report) for s in {r['status'] for r in report}})


if __name__ == '__main__':
    main()
