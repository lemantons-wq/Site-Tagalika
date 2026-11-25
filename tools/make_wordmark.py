#!/usr/bin/env python3
"""Turns the brand name into vector outlines: static/assets/img/wordmark.svg.

The site inlines that SVG in the header and footer, so visitors never download
the font. Font: Big Shoulders Stencil Display ExtraBold (SIL OFL, tools/fonts).

Needs:  pip install fonttools brotli uharfbuzz
Run:    python3 tools/make_wordmark.py [text]
"""
import io
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "tools" / "fonts" / "big-shoulders-stencil-display-latin-800-normal.woff2"
OUT = ROOT / "static" / "assets" / "img" / "wordmark.svg"
TEXT = sys.argv[1] if len(sys.argv) > 1 else "Tagalika"
TRACKING = 20  # extra space between letters, in font units (1000 per em)

font = TTFont(FONT)
glyphset = font.getGlyphSet()
order = font.getGlyphOrder()

# Shape with HarfBuzz so kerning from the font is applied
# HarfBuzz needs plain TrueType/OpenType bytes, so unpack the WOFF2 first
sfnt = io.BytesIO()
plain = TTFont(FONT)
plain.flavor = None
plain.save(sfnt)
blob = hb.Blob(sfnt.getvalue())
face = hb.Face(blob)
hbfont = hb.Font(face)
buf = hb.Buffer()
buf.add_str(TEXT)
buf.guess_segment_properties()
hb.shape(hbfont, buf, {"kern": True, "liga": True})

svg_pen = SVGPathPen(glyphset)
bounds_pen = BoundsPen(glyphset)
x = 0
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    name = order[info.codepoint]
    # font units have y pointing up; SVG has y pointing down
    t = (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)
    glyphset[name].draw(TransformPen(svg_pen, t))
    glyphset[name].draw(TransformPen(bounds_pen, t))
    x += pos.x_advance + TRACKING

xmin, ymin, xmax, ymax = bounds_pen.bounds
pad = 4
vb = f"{xmin - pad:.0f} {ymin - pad:.0f} {xmax - xmin + 2 * pad:.0f} {ymax - ymin + 2 * pad:.0f}"
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{TEXT}">'
       f'<path fill="currentColor" d="{svg_pen.getCommands()}"/></svg>\n')
OUT.write_text(svg, encoding="utf-8")
print(f"wrote {OUT.relative_to(ROOT)} ({len(svg)} bytes), viewBox {vb}")
