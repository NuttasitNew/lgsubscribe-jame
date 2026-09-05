#!/usr/bin/env python3
"""Render SAQ11A-matching copy with Sukhumvit Set (system TTC)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TTC = Path("/System/Library/Fonts/Supplemental/SukhumvitSet.ttc")
CANVAS = 1254
COPY_X = 742
MAX_TEXT_WIDTH = 470
BOLD = 5
MEDIUM = 3


def load_font(size: int, index: int) -> ImageFont.FreeTypeFont:
    if not TTC.exists():
        raise SystemExit(f"Missing Sukhumvit Set at {TTC}")
    return ImageFont.truetype(str(TTC), size, index=index)


def wrap(text: str, font: ImageFont.FreeTypeFont, max_width: int, max_lines: int) -> list[str]:
    words = str(text).split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = word if not line else f"{line} {word}"
        if font.getlength(candidate) <= max_width or not line:
            line = candidate
            continue
        lines.append(line)
        line = word
        if len(lines) == max_lines - 1:
            break
    if line and len(lines) < max_lines:
        lines.append(line)
    return lines or [str(text)]


def main() -> None:
    payload = json.load(sys.stdin)
    copy = payload["copy"]
    output = Path(payload["output"])
    output.parent.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    eyebrow_font = load_font(50, BOLD)
    title_font = load_font(54, BOLD)
    subtitle_font = load_font(26, MEDIUM)
    bullet_font = load_font(25, MEDIUM)

    y = 152
    draw.text((COPY_X, y), copy["eyebrow"], font=eyebrow_font, fill=(23, 23, 23, 255), anchor="ls")
    y += 70
    for line in wrap(copy["title"], title_font, MAX_TEXT_WIDTH, 2):
        draw.text((COPY_X, y), line, font=title_font, fill=(23, 23, 23, 255), anchor="ls")
        y += 62
    y += 8
    draw.text((COPY_X, y), copy["subtitle"], font=subtitle_font, fill=(60, 53, 48, 255), anchor="ls")
    y += 54
    for bullet in copy["bullets"][:6]:
        draw.text(
            (COPY_X, y),
            f"• {bullet}",
            font=bullet_font,
            fill=(48, 42, 37, 255),
            anchor="ls",
        )
        y += 54

    image.save(output)


if __name__ == "__main__":
    main()
