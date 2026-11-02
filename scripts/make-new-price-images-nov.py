#!/usr/bin/env python3
"""Create November promotion stills for models that have no earlier still.

Codex CLI gets two images: an existing still of the same category (design reference) and the
official LG packshot of the exact SKU (product reference), plus the exact copy. The shared footer
is then pasted from the reference so it stays pixel-identical across the set.

Usage: python scripts/make-new-price-images-nov.py [FOLDER ...]   # no args = all JOBS
Requires pillow and a logged-in `codex` CLI. Packshots come from outputs/nov-2026/packshots/sources.json.
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PREVIOUS = ROOT / '.gen/Price list_Oct/used'
TARGET_SET = ROOT / '.gen/Price list_Nov/unused'
WORK = ROOT / '.gen/nov_2026/new'
SOURCES = ROOT / 'outputs/nov-2026/packshots/sources.json'
def footer_top(image):
    """First row of the red footer band, read down the left edge."""
    px = image.load()
    y = image.height - 1
    while y > 900 and px[3, y][0] > 150 and px[3, y][1] < 80:
        y -= 1
    return y + 1


def ref(folder):
    return PREVIOUS / folder / f'{folder}__Price-list_Oct.png'

TAG_FIRST_BILL = lambda months: ['promotion', 'บิลแรก', '149.-', 'ลด 50%', f'อีก {months} รอบบิล']
# Folder -> design reference, tag lines (top to bottom), price box main number. Copy comes from sources.json.
JOBS = {
    'WS523S.AEWPLTH': (ref('WD110MN.ABGPLMT'), ['promotion', 'ราคา', '99.-', '9 รอบบิลแรก'], '99.-'),
    'GC-B52APGAM.ADHPLMT': (ref('GV-B25FFGDB.ABMPLMT'), TAG_FIRST_BILL(2), '149.-'),
    'GC-B257SQYL.AMCPLMT': (ref('GV-B25FFGDB.ABMPLMT'), TAG_FIRST_BILL(11), '149.-'),
    'FX2725SFXKA.AEBPETH': (ref('FV1413H4M.AMBPETH'), TAG_FIRST_BILL(5), '149.-'),
    'FV1413S2BA.ABLPETH': (ref('FV1413H4M.AMBPETH'), TAG_FIRST_BILL(5), '149.-'),
    'RX10VHP3KR.AEBPETH': (ref('FV1413H4M.AMBPETH'), TAG_FIRST_BILL(5), '149.-'),
    'MD19GQGA1.ATH': (ref('DD23GMWE1S.ATH'), TAG_FIRST_BILL(5), '149.-'),
    'MD19GQGA1S.ATH': (ref('DD23GMWE1S.ATH'), ['promotion', 'บิลแรก', '149.-'], '149.-'),
    '75QNED86BSA.ATM': (ref('100QNED86BS.ATM'), ['promotion', 'ลด 50%', '6 รอบบิลแรก'], '499.-'),
    '27GX704A-B.ATM': (ref('S95TR.DTHALLK'), ['ชำระล่วงหน้า', '50%', '12 รอบบิลแรก'], '224.50'),
}
# Short copy in the series style (3-4 brief bullets); facts from the official pages / PDF in sources.json.
COPY = {
    'GC-B52APGAM.ADHPLMT': ('ตู้เย็น LG Multi-Door', None,
                            ['ความจุ 18.1 คิว / 511 ลิตร', 'ดีไซน์ประตูกระจก สี Essence White', 'ขนาด 830 × 1920 × 595 มม.']),
    'GC-B257SQYL.AMCPLMT': ('ตู้เย็น LG Side-by-Side', None,
                            ['ความจุ 22.9 คิว / 649 ลิตร', 'ระบบ Smart Inverter', 'ขนาด 913 × 1790 × 735 มม.']),
    'FX2725SFXKA.AEBPETH': ('เครื่องซักผ้าฝาหน้า LG', None, ['ซัก 25 กก.', 'AI DD และ ezDispense', 'Steam ลดรอยยับ']),
    'FV1413S2BA.ABLPETH': ('เครื่องซักผ้าฝาหน้า LG', None,
                           ['ซัก 13 กก.', 'AI DD และ TurboWash360°', 'ขนาด 600 × 850 × 615 มม.']),
    'RX10VHP3KR.AEBPETH': ('เครื่องอบผ้า LG', None, ['อบ 10 กก.', 'Dual Inverter Heat Pump', 'ขนาด 600 × 850 × 660 มม.']),
    'MD19GQGA1.ATH': ('เครื่องลดความชื้น LG PuriCare', 'ขนาด 19 ลิตร รุ่น MD19GQGA1.ATH',
                      ['ลดความชื้น 19 ลิตร/วัน', 'ขนาด 415 × 715 × 296 มม.', 'Dual Inverter Compressor',
                       'ควบคุมผ่าน LG ThinQ™']),
    'MD19GQGA1S.ATH': ('เครื่องลดความชื้น LG PuriCare', 'ขนาด 19 ลิตร รุ่น MD19GQGA1S.ATH',
                       ['ลดความชื้น 19 ลิตร/วัน', 'ขนาด 415 × 715 × 296 มม.', 'ควบคุมผ่าน LG ThinQ™',
                        'แถมฟรี LG PuriCare AeroMini']),
    '75QNED86BSA.ATM': ('โทรทัศน์ LG QNED evo AI', None,
                        ['Mini LED 4K', 'Dynamic QNED Color Pro', 'Alpha 8 AI Processor 4K Gen 3',
                         'Dolby Vision และ Dolby Atmos']),
    '27GX704A-B.ATM': ('จอมอนิเตอร์ LG UltraGear OLED', None,
                       ['OLED QHD 240Hz', 'ตอบสนอง 0.03ms (GtG)', 'ขาตั้งปรับระดับและหมุนได้']),
}
EXTRA_IMAGES = {'MD19GQGA1S.ATH': ROOT / 'outputs/nov-2026/packshots/MD19GQGA1S.ATH_gift-AS30GGW10.jpg'}
EXTRA_PRODUCT = {
    # The S variant ships with a free AeroMini purifier; the reference still already shows one.
    'MD19GQGA1S.ATH': 'Also place the free gift from image 3 (LG PuriCare AeroMini air purifier) standing next to the'
                      ' dehumidifier, smaller, as the gift purifier is placed in image 1; reproduce image 3 faithfully.',
    'MD19GQGA1.ATH': 'Show ONLY the dehumidifier. Remove the small air purifier that appears in image 1.',
}

PROMPT = """Use your image generation tool to create ONE new square promotional image (1254x1254).
Image 1 is the DESIGN REFERENCE: copy its design exactly — warm beige background with the large soft
white circle, round cream podium, red hanging tag with rope at the same place and style, title /
subtitle / bullet typography, sizes and positions, the red "เริ่มต้น ... /เดือน ไม่ล็อควงเงินบัตรเครดิต"
price box, and the red LG Subscribe footer. It must look like part of the same series.
Image 2 is the PRODUCT: place this exact product on the podium in place of image 1's product. Reproduce
it faithfully — same shape, proportions, color, doors/panels, handles, display and logo positions.
Do not invent, add or remove product features. {extra}

Use exactly this Thai text, spelled exactly as given:
- Red hanging tag lines, top to bottom: {tag}
- Title: {title}
- Subtitle: {subtitle}
- Bullets (each starts with •): {bullets}
- Price box: "เริ่มต้น" above, big "{price}" with small "/เดือน", then "ไม่ล็อควงเงินบัตรเครดิต"
- Footer: identical to image 1.
No other text anywhere. After generating, copy the PNG to {out} and print that path.
Do not modify any other file."""


def trimmed(path, folder):
    """Packshot with its white margin removed, so the product fills the reference image."""
    image = Image.open(path).convert('RGB')
    box = ImageChops.difference(image, Image.new('RGB', image.size, 'white')).point(lambda v: 255 if v > 12 else 0).getbbox()
    out = WORK / f'{folder}-{Path(path).stem}-trim.png'
    image.crop(box).save(out)
    return out


def build(folder, source):
    reference, tag, price = JOBS[folder]
    title, subtitle, bullets = COPY.get(folder, (source['title'], source['subtitle'], source['bullets']))
    raw = WORK / f'{folder}-codex.png'
    raw.unlink(missing_ok=True)
    prompt = PROMPT.format(extra=EXTRA_PRODUCT.get(folder, ''), tag=' / '.join(f'"{t}"' for t in tag),
                           title=title, subtitle=subtitle or source['subtitle'],
                           bullets=' ; '.join(f'"{b}"' for b in bullets), price=price, out=raw)
    images = [reference, trimmed(SOURCES.parent / Path(source['file']).name, folder)]
    if folder in EXTRA_IMAGES:
        images.append(trimmed(EXTRA_IMAGES[folder], folder))
    subprocess.run(['codex', 'exec', '-s', 'workspace-write', '-C', str(ROOT), '--skip-git-repo-check',
                    *[arg for image in images for arg in ('-i', str(image))], '-'],
                   input=prompt, text=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert raw.is_file(), f'Codex produced no image for {folder}'
    ref_img = Image.open(reference).convert('RGB')
    gen = Image.open(raw).convert('RGB')
    if gen.size != ref_img.size:
        gen = gen.resize(ref_img.size, Image.LANCZOS)
    # Paste the series footer from the reference so every still shares the exact same band,
    # but only when Codex drew the band at the same height (otherwise two edges would show).
    out = gen
    top_ref, top_gen = footer_top(ref_img), footer_top(gen)
    if abs(top_ref - top_gen) <= 3:
        mask = Image.new('L', ref_img.size, 0)
        mask.paste(255, (0, top_ref + 4, ref_img.width, ref_img.height))
        out = Image.composite(ref_img, gen, mask.filter(ImageFilter.GaussianBlur(2)))
    else:
        print(f'  footer kept as generated ({folder}: ref {top_ref}, gen {top_gen})')
    target = TARGET_SET / folder / f'{folder}__Price-list_Nov.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    out.save(target)
    return target


def main():
    sources = {s['sku']: s for s in json.loads(SOURCES.read_text())}
    WORK.mkdir(parents=True, exist_ok=True)
    for folder in sys.argv[1:] or JOBS:
        source = sources.get(folder)
        if not source or not source.get('matchesPdf'):
            print('skip', folder, '(no verified packshot)')
            continue
        print('built', build(folder, source), flush=True)


if __name__ == '__main__':
    main()
