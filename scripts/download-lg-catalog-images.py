#!/usr/bin/env python3
"""Download official LG packshots into public/images/products/lg-catalog."""

from __future__ import annotations

import re
import subprocess
import time
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG_TS = ROOT / "lib" / "catalog-products.ts"
OUT_DIR = ROOT / "public" / "images" / "products" / "lg-catalog"
SOURCES = OUT_DIR / "SOURCES.md"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
SKIP_PAGE_SUBSTRINGS = ("/th/subscribe/",)
ENTRY_RE = re.compile(
    r"""(?P<key>"[^"]+"|[A-Za-z0-9][A-Za-z0-9-]*)\s*:\s*\{
        (?P<body>
            (?:
                [^{}]
                |\{(?:[^{}]|\{[^{}]*\})*\}
            )*
        )
    \}""",
    re.VERBOSE,
)


def parse_catalog_sources() -> list[dict[str, str]]:
    text = CATALOG_TS.read_text(encoding="utf-8")
    start = text.index("const catalogProductSources")
    end = text.index("};", start)
    block = text[start:end]
    rows = []
    for match in ENTRY_RE.finditer(block):
        key = match.group("key").strip('"')
        body = match.group("body")
        image = re.search(r'image:\s*"([^"]+)"', body)
        url = re.search(r'officialUrl:\s*"([^"]+)"', body)
        if not image or not url:
            continue
        rows.append({"model": key, "image": image.group(1), "officialUrl": url.group(1)})
    return rows


def fetch(url: str, timeout: int = 60) -> bytes:
    result = subprocess.run(
        [
            "curl",
            "-fsSL",
            "--max-time",
            str(timeout),
            "-A",
            UA,
            "-H",
            "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "-H",
            "Accept-Language: th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
            "--url",
            url,
        ],
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(stderr or f"curl failed for {url}")
    return result.stdout


def absolutize(path: str) -> str:
    if path.startswith("http"):
        return path
    return f"https://www.lg.com{path}"


def strip_rendition(url: str) -> str:
    return re.sub(r"/jcr:content/renditions/[^?#]+", "", url)


def model_tokens(model: str) -> list[str]:
    compact = re.sub(r"[^a-z0-9]+", "", model.lower())
    tokens = [compact]
    if "0" in compact:
        tokens.append(compact.replace("0", "o"))
    dashed = model.lower().replace(" ", "")
    if dashed not in tokens:
        tokens.append(dashed)
    return [token for token in tokens if len(token) >= 5]


def url_matches_model(url: str, model: str) -> bool:
    haystack = re.sub(r"[^a-z0-9]+", "", url.lower())
    return any(token in haystack for token in model_tokens(model))


def pick_packshot(html: str, model: str) -> str | None:
    og = re.search(r'property="og:image"\s+content="([^"]+)"', html)
    og_url = strip_rendition(og.group(1)) if og else None

    originals: list[str] = []
    seen: set[str] = set()
    for raw in re.findall(r"/content/dam/channel/wcms/[^\"'\s]+?\.(?:jpg|jpeg|png)", html, re.I):
        url = strip_rendition(absolutize(raw.split("/jcr:content/")[0]))
        if url in seen:
            continue
        seen.add(url)
        originals.append(url)

    def is_gallery(url: str) -> bool:
        lower = url.lower()
        if "/feature/" in lower:
            return False
        return "/gallery/" in lower or "thumbnail" in lower or "basic" in lower

    gallery = [url for url in originals if is_gallery(url)]
    matched_gallery = [url for url in gallery if url_matches_model(url, model)]
    if og_url and url_matches_model(og_url, model):
        return og_url
    if matched_gallery:
        return matched_gallery[0]
    if og_url:
        return og_url
    if gallery:
        return gallery[0]
    return originals[0] if originals else None


def to_catalog_jpeg(data: bytes) -> bytes:
    image = Image.open(BytesIO(data)).convert("RGB")
    width, height = image.size
    side = max(width, height)
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    canvas.paste(image, ((side - width) // 2, (side - height) // 2))
    canvas = canvas.resize((450, 450), Image.Resampling.LANCZOS)
    out = BytesIO()
    canvas.save(out, "JPEG", quality=90, optimize=True)
    return out.getvalue()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = parse_catalog_sources()
    manifest = []
    for index, row in enumerate(rows, start=1):
        local_name = Path(row["image"]).name
        dest = OUT_DIR / local_name
        skipped = any(part in row["officialUrl"] for part in SKIP_PAGE_SUBSTRINGS)
        record = {
            "model": row["model"],
            "local": local_name,
            "page": row["officialUrl"],
            "asset": "",
            "status": "",
        }
        if skipped:
            record["status"] = "skipped-unresolved-page"
            manifest.append(record)
            print(f"[{index}/{len(rows)}] skip {row['model']} ({row['officialUrl']})")
            continue
        try:
            html = fetch(row["officialUrl"]).decode("utf-8", errors="replace")
            asset = pick_packshot(html, row["model"])
            if not asset:
                raise RuntimeError("no packshot found")
            record["asset"] = asset
            payload = fetch(asset)
            dest.write_bytes(to_catalog_jpeg(payload))
            record["status"] = "downloaded"
            print(f"[{index}/{len(rows)}] {row['model']} <- {asset}")
        except (RuntimeError, OSError) as error:
            record["status"] = f"failed:{error}"
            print(f"[{index}/{len(rows)}] FAIL {row['model']}: {error}")
        manifest.append(record)
        time.sleep(0.4)

    lines = [
        "# Official LG catalog image sources",
        "",
        "These files are official product packshots downloaded from the matching LG product pages.",
        "The website uses only the local files in this folder, not live `lg.com` image URLs.",
        "",
        f"Downloaded: 21 August 2026",
        "",
        "| Local file | Model | Official product page | Original image asset | Status |",
        "| --- | --- | --- | --- | --- |",
    ]
    for item in manifest:
        lines.append(
            f"| `{item['local']}` | `{item['model']}` | {item['page']} | {item['asset'] or '—'} | {item['status']} |"
        )
    SOURCES.write_text("\n".join(lines) + "\n", encoding="utf-8")
    failed = [item for item in manifest if item["status"].startswith("failed")]
    print(f"wrote {SOURCES} ({len(manifest)} rows, {len(failed)} failed)")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
