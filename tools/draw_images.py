#!/usr/bin/env python3
"""Generates the product illustrations in static/assets/img/*.svg.

All pictures are drawn from simple primitives (rolls, sheets, canisters),
so they share one visual style. Run:  python3 tools/draw_images.py
Replace any SVG with a real photo later (and update "image" in content/*.json).
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "static" / "assets" / "img"


# ---------- colour helpers ----------
def _rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def _hex(c):
    return "#" + "".join(f"{max(0, min(255, round(v))):02x}" for v in c)


def mix(a, b, t):
    ca, cb = _rgb(a), _rgb(b)
    return _hex([ca[i] + (cb[i] - ca[i]) * t for i in range(3)])


def light(c, t):
    return mix(c, "#ffffff", t)


def dark(c, t):
    return mix(c, "#000000", t)


class Drawing:
    def __init__(self, w, h, bg=("#f4f7f5", "#e3ebe6")):
        self.w, self.h = w, h
        self.defs, self.body, self._ids = [], [], 0
        self.defs.append(
            f'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{bg[0]}"/><stop offset="1" stop-color="{bg[1]}"/></linearGradient>'
            '<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>'
            '<filter id="blurS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>'
        )
        self.body.append(f'<rect width="{w}" height="{h}" fill="url(#bg)"/>')
        # soft floor
        self.body.append(
            f'<ellipse cx="{w/2}" cy="{h*0.86}" rx="{w*0.62}" ry="{h*0.16}" fill="#ffffff" opacity="0.55" filter="url(#blur)"/>'
        )

    def uid(self, p):
        self._ids += 1
        return f"{p}{self._ids}"

    def lin(self, stops, vertical=True):
        gid = self.uid("g")
        x2, y2 = ("0", "1") if vertical else ("1", "0")
        s = "".join(f'<stop offset="{o}" stop-color="{c}"{"" if a == 1 else f" stop-opacity=\"{a}\""}/>'
                    for o, c, a in stops)
        self.defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>')
        return f"url(#{gid})"

    def shadow(self, cx, cy, rx, ry, op=0.28):
        self.body.append(
            f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="#1c2a24" opacity="{op}" filter="url(#blur)"/>')

    # ---------- a roll (cylinder) ----------
    def roll(self, cx, cy, R, L, mat, direction="right", k=0.34, core=0.27, rings=7, shadow=True):
        """Face centre at (cx, cy). direction: right/left = lying, body to that side;
        down = standing, face on top."""
        a = 1 if mat.get("alpha") is None else mat["alpha"]
        if shadow:
            if direction == "down":
                self.shadow(cx, cy + L + k * R * 0.3, R * 1.08, k * R * 0.9)
            else:
                sx = cx + (L / 2 if direction == "right" else -L / 2)
                self.shadow(sx, cy + R * 0.97, L / 2 + k * R + 6, R * 0.13)
        tf = {
            "right": f"translate({cx},{cy})",
            "left": f"translate({cx},{cy}) scale(-1,1)",
            "down": f"translate({cx},{cy}) rotate(90) scale(1,-1)",
        }[direction]
        b = mat["body"]
        if mat.get("metal"):
            stops = [(0, dark(b, .45), a), (.12, light(b, .35), a), (.24, light(b, .85), a), (.34, light(b, .2), a),
                     (.55, dark(b, .25), a), (.78, dark(b, .45), a), (.9, light(b, .15), a), (1, dark(b, .35), a)]
        else:
            stops = [(0, dark(b, .22), a), (.18, light(b, .25), a), (.3, light(b, .45), a), (.55, b, a),
                     (.82, dark(b, .2), a), (.93, light(b, .02), a), (1, dark(b, .18), a)]
        body_fill = self.lin(stops)
        face = mat.get("face", light(b, .12))
        face_fill = self.lin([(0, light(face, .25), 1), (1, dark(face, .08), 1)], vertical=False)
        rim = dark(b, .35)
        g = [f'<g transform="{tf}">']
        g.append(f'<path d="M0,{-R} L{L},{-R} A{k*R},{R} 0 0 1 {L},{R} L0,{R} Z" fill="{body_fill}"/>')
        # edge line of far end
        g.append(f'<path d="M{L},{-R} A{k*R},{R} 0 0 1 {L},{R}" fill="none" stroke="{rim}" stroke-opacity=".25" stroke-width="1.2"/>')
        if mat.get("streaks"):
            for yy, op in ((-R * .62, .55), (-R * .48, .35), (R * .35, .25)):
                g.append(f'<rect x="{k*R*0.2}" y="{yy}" width="{L}" height="{R*0.05}" fill="#ffffff" opacity="{op}"/>')
        g.append(f'<ellipse rx="{k*R}" ry="{R}" fill="{face_fill}" fill-opacity="{max(a, .85)}"/>')
        rc = core * R
        for i in range(1, rings + 1):
            r = rc + (R - rc) * i / (rings + 1)
            g.append(f'<ellipse rx="{k*r:.2f}" ry="{r:.2f}" fill="none" stroke="{dark(face, .35)}" stroke-opacity=".14" stroke-width="1"/>')
        g.append(f'<ellipse rx="{k*R}" ry="{R}" fill="none" stroke="{rim}" stroke-opacity=".45" stroke-width="1.6"/>')
        if core:
            cf = mat.get("core", "#c69a68")
            g.append(f'<ellipse rx="{k*rc}" ry="{rc}" fill="{cf}" stroke="{dark(cf, .35)}" stroke-width="1.2"/>')
            rh = rc * 0.76
            hole = self.lin([(0, "#2e2117", 1), (.55, "#4a3424", 1), (1, "#8b6440", 1)], vertical=False)
            g.append(f'<ellipse rx="{k*rh}" ry="{rh}" fill="{hole}"/>')
        g.append("</g>")
        self.body.append("".join(g))

    # ---------- flat sheets / film tail ----------
    def poly(self, pts, fill, stroke=None, op=1, sw=1):
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        s = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
        self.body.append(f'<polygon points="{p}" fill="{fill}" opacity="{op}"{s}/>')

    def sheets(self, x, y, w, d, n, color, gap=4):
        """Stack of sheets drawn as parallelograms (top view in perspective)."""
        self.shadow(x + w / 2 + d * .35, y - d * .45 + n * gap, w * .6 + d * .3, d * .55, .22)
        for i in range(n):
            yy = y + (n - 1 - i) * gap
            c = color if i % 2 == 0 else dark(color, .04)
            # side edge
            self.poly([(x, yy), (x + w, yy), (x + w, yy + gap), (x, yy + gap)], dark(color, .18))
            self.poly([(x + w, yy), (x + w + d * .7, yy - d), (x + w + d * .7, yy - d + gap), (x + w, yy + gap)], dark(color, .25))
        top = self.lin([(0, light(color, .35), 1), (1, color, 1)], vertical=False)
        self.poly([(x, y), (x + d * .7, y - d), (x + w + d * .7, y - d), (x + w, y)], top, dark(color, .2), 1, .8)

    # ---------- canister ----------
    def canister(self, x, y, w, h, depth=60, body="#f2f4f1", label="#23574a", text="22 kg"):
        dx, dy = depth * .85, -depth * .5
        self.shadow(x + w / 2 + dx / 2, y + h + 4, w * .7, 22, .3)
        front = self.lin([(0, dark(body, .06), 1), (.35, light(body, .6), 1), (1, dark(body, .1), 1)], vertical=False)
        side = self.lin([(0, dark(body, .16), 1), (1, dark(body, .26), 1)], vertical=False)
        top = self.lin([(0, light(body, .5), 1), (1, dark(body, .04), 1)])
        edge = dark(body, .3)
        r = 14
        # side face
        self.poly([(x + w, y + r), (x + w + dx, y + r + dy), (x + w + dx, y + h + dy - 6), (x + w, y + h)], side, edge, 1, 1)
        # top face
        self.poly([(x + r, y), (x + w - 4, y), (x + w + dx - 4, y + dy), (x + r + dx, y + dy)], top, edge, 1, 1)
        # front
        self.body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{front}" stroke="{edge}" stroke-width="1.2"/>')
        # ribs
        for i in (0.28, 0.72):
            self.body.append(f'<line x1="{x+8}" y1="{y+h*i}" x2="{x+w-8}" y2="{y+h*i}" stroke="{dark(body,.12)}" stroke-width="2" stroke-linecap="round" opacity=".5"/>')
        # handle (on top, towards back)
        hx, hy = x + w * .3 + dx * .55, y + dy * .55
        hw = w * .42
        self.body.append(
            f'<path d="M{hx},{hy} q0,-46 {hw*.5},-46 q{hw*.5},0 {hw*.5},46 l-16,0 q0,-28 {-hw*.5+16},-28 q{-hw*.5+16},0 {-hw*.5+16},28 Z" '
            f'fill="{dark(body,.08)}" stroke="{edge}" stroke-width="1.2"/>')
        # cap
        cx, cy = x + w * .14 + dx * .45, y + dy * .45
        self.body.append(f'<rect x="{cx-18}" y="{cy-26}" width="36" height="26" fill="{label}"/>'
                         f'<ellipse cx="{cx}" cy="{cy-26}" rx="18" ry="6" fill="{light(label,.25)}"/>'
                         f'<ellipse cx="{cx}" cy="{cy}" rx="18" ry="6" fill="{dark(label,.2)}"/>')
        # label
        lx, ly, lw, lh = x + w * .14, y + h * .36, w * .72, h * .3
        self.body.append(f'<rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="6" fill="{label}"/>'
                         f'<rect x="{lx+12}" y="{ly+12}" width="{lw*.45}" height="6" rx="3" fill="#ffffff" opacity=".55"/>'
                         f'<text x="{lx+lw/2}" y="{ly+lh*.72}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" '
                         f'font-weight="700" font-size="{lh*.38:.0f}" fill="#ffffff">{text}</text>')

    def save(self, name):
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}">'
               f'<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>')
        (OUT / name).write_text(svg, encoding="utf-8")
        print("wrote", name, len(svg), "bytes")


SILVER = {"body": "#b7bec5", "metal": True, "face": "#d9dee2", "core": "#c69a68"}
GOLD = {"body": "#c9a45c", "metal": True, "face": "#e1c88f"}
WHITE = {"body": "#e9ecee", "face": "#f7f8f8"}
KRAFT = {"body": "#b9895a", "face": "#cfa173"}
FILM = {"body": "#bcd7e6", "metal": True, "alpha": .78, "face": "#dcebf3", "streaks": True, "core": "#d8dde0"}
PASTELS = ["#f2a7b8", "#c7b2e8", "#f4dc7a", "#a9dcc0", "#9fcdee", "#f7bf9c"]


def inner_liner():
    d = Drawing(800, 600)
    d.roll(455, 150, 150, 260, GOLD, "down", k=.3, core=.26)
    d.roll(150, 360, 150, 300, SILVER, "right", k=.34, core=.26)
    d.save("inner-liner.svg")


def food_paper():
    d = Drawing(800, 600)
    d.roll(560, 100, 115, 320, KRAFT, "down", k=.3, core=.3)
    d.roll(110, 280, 115, 330, WHITE, "right", k=.34, core=.28)
    d.sheets(400, 505, 270, 90, 10, "#f6f2e7", gap=4)
    d.save("food-paper.svg")


def wrapping():
    d = Drawing(800, 600)
    xs = [110, 230, 350, 470, 590, 700]
    hs = [300, 360, 270, 340, 290, 320]
    for i, (x, h, c) in enumerate(zip(xs, hs, PASTELS)):
        y = 520 - h - 20 * (i % 2)
        d.roll(x, y, 58, h, {"body": c, "face": light(c, .15)}, "down", k=.32, core=.42, rings=3)
    d.save("wrapping.svg")


def plotter():
    d = Drawing(800, 600)
    d.roll(560, 70, 62, 360, WHITE, "down", k=.3, core=.3)
    d.roll(680, 110, 62, 340, WHITE, "down", k=.3, core=.3)
    for i, (x, y) in enumerate([(200, 290), (160, 360), (120, 430)]):  # back to front
        d.roll(x, y, 62, 420, WHITE, "right", k=.32, core=.3, rings=5)
    d.save("plotter.svg")


def pp_film():
    d = Drawing(800, 600)
    d.roll(600, 110, 110, 310, FILM, "down", k=.3, core=.32, rings=9)
    d.roll(460, 230, 70, 230, {"body": "#eef0f1", "face": "#fafbfb", "core": "#d8dde0"}, "down", k=.3, core=.4, rings=4)
    d.roll(120, 330, 135, 300, FILM, "right", k=.34, core=.3, rings=9)
    d.save("pp-film.svg")


def adhesive():
    d = Drawing(800, 600)
    d.canister(380, 170, 230, 300, depth=70)
    d.canister(150, 250, 230, 300, depth=70)
    d.save("adhesive.svg")


def hero():
    d = Drawing(900, 720, bg=("#eef4f0", "#dfe9e3"))
    d.roll(600, 70, 110, 330, GOLD, "down", k=.3, core=.26)
    d.roll(440, 160, 100, 330, KRAFT, "down", k=.3, core=.3)
    d.canister(560, 360, 190, 250, depth=55)
    d.roll(70, 470, 120, 300, SILVER, "right", k=.34, core=.26)
    d.save("hero.svg")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    inner_liner(); food_paper(); wrapping(); plotter(); pp_film(); adhesive(); hero()
