"""Foil masks for the attractor cards: one texture per card, drawn from that card's own mathematics.

Each mask is a white image whose alpha is the foil: deck.css lays a slow rainbow over it, so the colour
shows only along the lines. Two kinds for the frame, as on printed holo cards (regular holo cards keep a matte frame):
  reverse  texture everywhere except the artwork window, which stays matte
  full     texture on the frame and panel, stronger (the gold cards)

Run from this folder:  python3 generate.py     (needs numpy, Pillow, scipy)
"""
import numpy as np
from PIL import Image

W, H = 560, 782                  # card ratio 63 : 88
S = 2                            # supersampling
w, h = W * S, H * S
ART = (0.0659, 0.1054, 0.8682, 0.3729)   # window as fractions of the card: x, y, width, height

yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
U, V = xx / w, yy / h            # 0..1 across the card
Xc, Yc = (U - .5) * W, (V - .5) * H   # pixels from the centre, at output scale


def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def lines(phase, width, wrapped=True):
    """Anti-aliased iso-lines at integer values of `phase`, `width` pixels wide (output scale)."""
    if wrapped:
        z = np.exp(2j * np.pi * phase)
        gy, gx = np.gradient(z)
        grad = np.hypot(np.hypot(gx.real, gx.imag), np.hypot(gy.real, gy.imag)) / np.sqrt(2) + 1e-9
        dist = np.abs(np.angle(z))                      # radians from the nearest line
        px = dist / grad                                # ...in pixels
        spacing = 2 * np.pi / grad                      # pixels between neighbouring lines
        return (1 - smooth(width * S * .5 - S * .6, width * S * .5 + S * .6, px)) * smooth(3.5 * S, 7.5 * S, spacing)
    else:
        gy, gx = np.gradient(phase)
        grad = np.hypot(gx, gy) + 1e-9
        px = np.abs(phase - np.round(phase)) / grad
    spacing = 1 / grad                                  # pixels between neighbouring lines
    return (1 - smooth(width * S * .5 - S * .6, width * S * .5 + S * .6, px)) * smooth(3.5 * S, 7.5 * S, spacing)


def art_window(feather=1.5):
    x0, y0, aw, ah = ART
    r = 0.011 * w                                       # corner radius
    cx, cy = (x0 + aw / 2) * w, (y0 + ah / 2) * h
    qx, qy = np.abs(xx - cx) - (aw * w / 2 - r), np.abs(yy - cy) - (ah * h / 2 - r)
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    return 1 - smooth(-feather * S, feather * S, d)     # 1 inside


def finish(name, alpha, kind, gain=1.0, wash=None):
    """Apply the region of `kind` and a faint wash of foil beneath the lines."""
    win = art_window()
    region = {"reverse": 1 - win, "full": 1 - win}[kind]
    wash = {"reverse": .07, "full": .1}[kind] if wash is None else wash
    alpha = np.maximum(np.nan_to_num(alpha) * gain * region, wash * region)
    alpha = np.clip(alpha, 0, 1)
    img = Image.fromarray((alpha * 255).astype(np.uint8), "L").resize((W, H), Image.LANCZOS)
    rgba = Image.merge("RGBA", [Image.new("L", (W, H), 255)] * 3 + [img])
    rgba.save(f"{name}.webp", "WEBP", quality=80, alpha_quality=70, method=6)
    print(name, kind, round(float(np.asarray(img).mean()) / 255, 3))


def at(scale_x, cx=.5, cy=.5):
    """Maths coordinates for the whole card: x spans +-scale_x, y keeps the aspect ratio."""
    k = 2 * scale_x / w
    return (xx - cx * w) * k, (yy - cy * h) * k


# 1  Clifford: the two update fields woven together (reverse)
X, Y = at(2.6)
a, b, c, d = -1.4, 1.6, 1.0, .7
f1, f2 = np.sin(a * Y) + c * np.cos(a * X), np.sin(b * X) + d * np.cos(b * Y)
finish("clifford", np.maximum(lines(f1 / .26, 1.25, False), lines(f2 / .26, 1.25, False)), "reverse", .9)

# 2  Peter de Jong: its two fields, other frequencies (reverse)
X, Y = at(3.1)
a, b, c, d = 1.4, -2.3, 2.4, -2.1
f1, f2 = np.sin(a * Y) - np.cos(b * X), np.sin(c * X) - np.cos(d * Y)
finish("dejong", np.maximum(lines(f1 / .3, 1.2, False), lines(f2 / .3, 1.2, False)), "reverse", .9)

# 3  Simon: swapped phase (reverse)
X, Y = at(2.7)
a, b, c, d = 1.9, 1.3, -1.6, .8
f1, f2 = np.cos(b * Y) + c * np.sin(b * X), np.cos(a * X) + d * np.sin(a * Y)
finish("simon", np.maximum(lines(f1 / .3, 1.2, False), lines(f2 / .3, 1.2, False)), "reverse", .9)

# 4  Ikeda: rings where the turn angle t(r) is a whole step, and spiral arms that follow the turning (reverse)
X, Y = at(2.1, .72, .5)
r = np.hypot(X, Y)
t = .4 - 6 / (1 + r ** 2)
th = np.arctan2(Y, X)
rings = lines((t - .4) / .22, 1.15, False)
arms = lines(18 * (th - 1.05 * t) / (2 * np.pi), 1.1)
finish("ikeda", np.maximum(rings, arms * .8), "reverse", .9)

# 5  Julia: contours of the smooth escape time (full)
X, Y = at(1.9)
z = X + 1j * Y
cj = -.8 + .156j
n = np.zeros(z.shape)
alive = np.ones(z.shape, bool)
for i in range(90):
    z = np.where(alive, z * z + cj, z)
    esc = alive & (np.abs(z) > 4)
    n[esc] = i + 1 - np.log2(np.log(np.abs(z[esc])) / np.log(4))
    alive &= ~esc
    z = np.where(alive, z, 4)
inside = alive
phase = n / 1.6
fine = lines(phase, 1.2, False) * (~inside)
finish("julia", fine, "full", .9)

# 6  Thomas: long flow lines of the 3D system, seen from the side (reverse)
rng = np.random.default_rng(6)
canvas = Image.new("L", (w, h), 0)
from PIL import ImageDraw
dr = ImageDraw.Draw(canvas)
bb, dt = .208186, .045
for _ in range(70):
    p = rng.uniform(-3, 3, 3)
    pts = []
    for i in range(1700):
        dp = np.array([np.sin(p[1]) - bb * p[0], np.sin(p[2]) - bb * p[1], np.sin(p[0]) - bb * p[2]])
        p = p + dp * dt
        if i > 100:
            pts.append((w * (.5 + p[0] / 9.2), h * (.5 + (p[1] * .86 + p[2] * .5) / 11.5)))
    dr.line(pts, fill=255, width=2)
finish("thomas", np.asarray(canvas, np.float64) / 255, "reverse", .8)

# 10  Bedhead: ripples from x * y inside the sine (reverse)
X, Y = at(3.0)
a, b = -.81, -.92
f1 = Y * np.sin(X * Y / b) + np.cos(a * X - Y)
f2 = X + np.sin(Y) / b
finish("bedhead", np.maximum(lines(f1 / .32, 1.1, False), lines(f2 / .45, 1.0, False) * .7), "reverse", .9)

# 11  McMullen: level sets of log |z^n + lambda / z^n| (full)
X, Y = at(1.6)
zc = X + 1j * Y + 1e-6
n3, lam = 3, .02
Fz = zc ** n3 + lam / zc ** n3
finish("mcmullen", lines(np.log(np.abs(Fz) + 1e-9) / .42, 1.25, False), "full", .9)

# ───────── Artwork foils ─────────
# As on printed holo cards, the foil in the artwork window sits on the background and the subject is cut out of
# it. Here the subject is the attractor itself, so the mask is the dark space around it (found from the render's
# brightness, with the attractor widened and softened a little), filled with one of three classic patterns:
#   bars    vertical holo bars, as on a regular holo card
#   etched  a fine fingerprint-like etching, as on the etched secret rares
#   pillar  a smooth field for sun-pillar colours, with a faint grain
from scipy import ndimage

AW, AH = 720, 540


def background(card):
    img = Image.open(f"../{card}.webp").convert("L").resize((AW, AH), Image.LANCZOS)
    lum = np.asarray(img, np.float64) / 255
    subject = smooth(.05, .2, ndimage.gaussian_filter(lum, 1.2))
    subject = ndimage.grey_dilation(subject, size=(9, 9))
    # The whole silhouette is cut out, holes and all, as a figure is on a printed card.
    solid = ndimage.binary_fill_holes(ndimage.binary_closing(subject > .35, iterations=6))
    subject = np.maximum(subject, solid)
    subject = ndimage.gaussian_filter(subject, 2.5)
    return 1 - np.clip(subject * 1.15, 0, 1)


def art_lines(phase, width):
    gy, gx = np.gradient(phase)
    grad = np.hypot(gx, gy) + 1e-9
    px = np.abs(phase - np.round(phase)) / grad
    return 1 - smooth(width * .5 - .6, width * .5 + .6, px)


ay, ax = np.mgrid[0:AH, 0:AW].astype(np.float64)


def bars(period=12):
    x = (ax % period) / period
    return smooth(.08, .2, x) * (1 - smooth(.55, .67, x))


def etched(seed):
    rng = np.random.default_rng(seed)
    warp = np.zeros_like(ax)
    for _ in range(9):
        k = rng.uniform(.004, .016)
        th = rng.uniform(0, np.pi)
        warp += rng.uniform(18, 46) * np.sin(k * (ax * np.cos(th) + ay * np.sin(th)) + rng.uniform(0, 2 * np.pi))
    th = rng.uniform(0, np.pi)
    field = ax * np.cos(th) + ay * np.sin(th) + warp
    return art_lines(field / 6.2, 1.6) * .95


def pillar(seed):
    """Columns of light of different widths (sun pillars), over a faint base, cut by fine diagonal etching."""
    rng = np.random.default_rng(seed)
    cols = np.zeros(AW)
    xs = np.arange(AW)
    for _ in range(11):
        c, wdt, amp = rng.uniform(0, AW), rng.uniform(10, 46), rng.uniform(.5, 1)
        d = np.minimum(np.abs(xs - c), AW - np.abs(xs - c))
        cols = np.maximum(cols, amp * np.exp(-(d / wdt) ** 2))
    cols = .18 + .82 * cols
    etch = smooth(.15, .45, np.abs(((ax + ay) / 5.5) % 1 - .5) * 2)
    return np.clip(cols[None, :] * (.6 + .4 * etch), 0, 1)


def art_foil(card, style, seed=1):
    pattern = {"bars": bars, "etched": lambda: etched(seed), "pillar": lambda: pillar(seed)}[style]()
    alpha = np.clip(background(card) * pattern, 0, 1)
    img = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    Image.merge("RGBA", [Image.new("L", (AW, AH), 255)] * 3 + [img]).save(f"art-{card}.webp", "WEBP", quality=80, alpha_quality=80, method=6)
    print("art", card, style, round(float(alpha.mean()), 3))


ART_STYLE = {
    "clifford": "bars", "layered": "bars", "symmetric": "bars", "gumowski": "bars", "harmonic": "bars",
    "dejong": "etched", "simon": "etched", "julia": "etched", "mcmullen": "etched",
    "ikeda": "pillar", "thomas": "pillar", "bedhead": "pillar",
}
for i, (card, style) in enumerate(ART_STYLE.items()):
    art_foil(card, style, seed=40 + i)
