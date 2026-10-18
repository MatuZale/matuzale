"""Foil masks for the attractor cards: one texture per card, drawn from that card's own mathematics.

Each mask is a white image whose alpha is the foil: deck.css lays a slow rainbow over it, so the colour
shows only along the lines. Three kinds, as on printed holo cards:
  reverse  texture everywhere except the artwork window, which stays matte
  regular  texture only inside the artwork window, the frame stays matte
  full     texture everywhere (the gold cards)

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
    region = {"reverse": 1 - win, "regular": win, "full": 1 - .55 * win}[kind]
    wash = {"reverse": .07, "regular": .2, "full": .1}[kind] if wash is None else wash
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

# 7  Layered Clifford: three lattices, three weights (regular)
def lattice(spacing, angle, weight):
    out = np.zeros_like(U)
    for k in range(3):
        ang = np.deg2rad(angle + 60 * k)
        out = np.maximum(out, lines((Xc * np.cos(ang) + Yc * np.sin(ang)) / spacing, 1.1, False))
    return out * weight
finish("layered", np.maximum.reduce([lattice(15, 0, 1), lattice(19, 9, .8), lattice(24, -7, .6)]), "regular", .95)

# 8  Symmetric icon: 23 spokes and guilloche rings around the window's centre (regular)
cx, cy = ART[0] + ART[2] / 2, ART[1] + ART[3] / 2
Xs, Ys = (U - cx) * W, (V - cy) * H
rr, th = np.hypot(Xs, Ys), np.arctan2(Ys, Xs)
spokes = lines(23 * th / (2 * np.pi), 1.0)
rings = lines(rr * (1 + .06 * np.cos(23 * th)) / 15, 1.1, False)
rings2 = lines(rr * (1 - .06 * np.cos(23 * th)) / 15 + .5, 1.0, False)
finish("symmetric", np.maximum(np.maximum(rings, rings2) * .9, spokes * .6), "regular", 1.0)

# 9  Gumowski-Mira: the map's own x' and y' fields; their curves fan out like wings (regular)
X, Y = at(14, .5, .21)
a, b, mu = .008, .05, -.496
G = lambda x: mu * x + 2 * (1 - mu) * x * x / (1 + x * x)
f1 = Y + a * Y * (1 - b * Y * Y) + G(X)
f2 = -X + G(f1)
finish("gumowski", np.maximum(lines(f1 / 1.15, 1.15, False), lines(f2 / 1.15, 1.15, False)), "regular", .95)

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

# 12  Harmonic: two poles, equipotentials and field lines (regular)
px1, px2 = (cx - .2) * W, (cx + .2) * W
x1, y1 = U * W - px1, V * H - cy * H
x2, y2 = U * W - px2, V * H - cy * H
r1, r2 = np.hypot(x1, y1), np.hypot(x2, y2)
pot = lines(np.log((r1 + 1e-6) / (r2 + 1e-6)) / .24, 1.1, False)
ang = lines((np.arctan2(y1, x1) - np.arctan2(y2, x2)) * 20 / (2 * np.pi), 1.0)
finish("harmonic", np.maximum(pot, ang * .85), "regular", .95)


# 13  Cosmos dust for the artwork windows: a seamless tile of round dots, mostly tiny, a few larger with a faint
# halo, thickening and thinning in drifts like a star field. Not a card texture: deck.css tints and shifts it
# differently on every card.
def cosmos(name="cosmos", n=600, dots=3300, seed=11):
    rng = np.random.default_rng(seed)
    gy, gx = np.mgrid[0:n, 0:n] / n
    dens = np.zeros((n, n))
    for _ in range(7):                                  # periodic drifts, so the tile repeats without a seam
        kx, ky = rng.integers(1, 4, 2) * rng.choice([-1, 1], 2)
        dens += np.cos(2 * np.pi * (kx * gx + ky * gy) + rng.uniform(0, 2 * np.pi)) * rng.uniform(.4, 1)
    dens = (dens - dens.min()) / (dens.max() - dens.min())
    dens = .12 + .88 * dens ** 1.7
    canvas = np.zeros((n, n))
    placed = 0
    while placed < dots:
        x, y = rng.integers(0, n, 2)
        if rng.random() > dens[y, x]:
            continue
        roll = rng.random()
        if roll < .80:
            sigma, amp, halo = rng.uniform(.55, .8), rng.uniform(.35, .8), 0
        elif roll < .97:
            sigma, amp, halo = rng.uniform(.85, 1.2), rng.uniform(.55, .95), 0
        else:
            sigma, amp, halo = rng.uniform(1.3, 1.8), 1.0, .14
        reach = int(np.ceil(4 * sigma * (3.2 if halo else 1)))
        ds = np.arange(-reach, reach + 1)
        iy, ix = (y + ds) % n, (x + ds) % n
        dy, dx = np.meshgrid(ds, ds, indexing="ij")
        r2 = dx * dx + dy * dy
        g = amp * np.exp(-r2 / (2 * sigma ** 2)) + halo * np.exp(-r2 / (2 * (sigma * 3.2) ** 2))
        sub = canvas[np.ix_(iy, ix)]
        canvas[np.ix_(iy, ix)] = np.maximum(sub, g)
        placed += 1
    alpha = np.clip(canvas, 0, 1)
    img = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    Image.merge("RGBA", [Image.new("L", (n, n), 255)] * 3 + [img]).save(f"{name}.webp", "WEBP", quality=85, alpha_quality=100, method=6)
    print(name, "tile", n, round(float(alpha.mean()), 3))


cosmos()
