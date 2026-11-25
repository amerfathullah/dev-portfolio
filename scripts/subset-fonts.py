#!/usr/bin/env python3
"""Regenerate the self-hosted font subsets in src/assets/fonts/.

The page only uses ASCII plus a few typographic marks, Inter at weights 400-600 and Cormorant
Garamond at 500 (display text). Google's "latin" files carry ~370-520 glyphs and the full weight
axis, so they are cut down here to keep the preloaded fonts small (~86 KB -> ~29 KB):

  inter-roman.woff2 / inter-italic.woff2   variable, wght 400-600
  cormorant-500.woff2                      static 500

The unicode-range in astro.config.mjs must match UNICODES below: characters outside it fall back
to the system font instead of rendering as missing glyphs.

Usage: python3 scripts/subset-fonts.py   (needs fonttools + brotli: pip install fonttools brotli)
"""

import io
import re
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"

# Keep in sync with UNICODE_RANGE in astro.config.mjs
UNICODES = [*range(0x20, 0x7F), 0xA0, 0xA9, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026]

CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Inter:ital,wght@0,100..900;1,100..900"
    "&family=Cormorant+Garamond:wght@300..700"
)
# Google serves woff2 only to browsers it recognises
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

FONTS = [
    # (family, style, output file, wght axis limit)
    ("Inter", "normal", "inter-roman.woff2", (400, 600)),
    ("Inter", "italic", "inter-italic.woff2", (400, 600)),
    ("Cormorant Garamond", "normal", "cormorant-500.woff2", 500),
]


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})) as res:
        return res.read()


def latin_sources(css: str) -> dict[tuple[str, str], str]:
    """Map (family, style) -> woff2 URL of its /* latin */ @font-face block."""
    sources = {}
    for subset_name, block in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*{([^}]*)}", css):
        if subset_name != "latin":
            continue
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = re.search(r"font-style:\s*(\w+)", block).group(1)
        sources[(family, style)] = re.search(r"url\(([^)]+)\)", block).group(1)
    return sources


def build(source: bytes, out: Path, wght) -> None:
    font = TTFont(io.BytesIO(source), lazy=False)
    options = subset.Options()
    # tnum: the "N+ years" count-up uses tabular-nums; without it each digit change reflows the summary (CLS)
    options.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum"]
    options.notdef_outline = True
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    # Subset first: instancing a lazily loaded font trips over the dropped glyphs
    font = instancer.instantiateVariableFont(font, {"wght": wght})
    font.flavor = "woff2"
    font.save(out)
    print(f"{out.relative_to(OUT.parent.parent.parent)}  {out.stat().st_size / 1024:.1f} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sources = latin_sources(fetch(CSS_URL).decode())
    for family, style, filename, wght in FONTS:
        build(fetch(sources[(family, style)]), OUT / filename, wght)


if __name__ == "__main__":
    main()
