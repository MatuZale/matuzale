"""Foils for the cards in the three printed rarities (deck.js HOLO, deck.css "Three printed foils").

  reverse  reverse holo: a foil all over the panel but the artwork window, as on the Sword & Shield cards: columns
           of chevron tiles in different shades, each with the card's energy symbol, and in every tile the
           map's own texture faintly etched (Chirikov: its invariant curves, the chaotic sea as dust;
           Hopalong: its mandala as sparkle; Popcorn: the tracks of its little steps)
                                                               -> reverse-<card>.webp, 560 x 782 (the card)
  amazing  amazing rare: the attractor breaks out of its window, so the card shows a cut-out of the render (the
           attractor without its dark background, in colour, fading out with the distance from the window)
                                                               -> cut-<card>.webp, 1200 x 900
           the splash that carries the glitter                 -> splash-<card>.webp, 600 x 450
           and one tile of glitter for all of them             -> glitter.webp, 256 x 256
  beam     holo rare: the beams are gradients, nothing to draw for them.
  window   for both rares on a dark background: the dark round the attractor, which carries the window's foil
                                                               -> art-<card>.webp, 720 x 540
           and for Halvorsen, an etched swirl in it, as on the Jirachi amazing rare
                                                               -> etch-halvorsen.webp, 1200 x 900
  paper    for every card: the mottled card stock under the print -> paper.webp, 512 x 512, a tile

Apart from the cut-outs, each image is white, its alpha the foil, like the masks of generate.py. That script
makes the foils of the first cards; this one only these, so neither rewrites the other's files. Sources are
the renders in assets/deck/ (from chaos_cards.py).

Run from this folder:  python3 generate_holo.py     (needs numpy, Pillow, scipy)
"""
import math

import numpy as np
from PIL import Image
from scipy import ndimage

W, H = 560, 782                  # card ratio 63 : 88
S = 2                            # supersampling
w, h = W * S, H * S
ART = (0.0659, 0.1054, 0.8682, 0.3729)   # window as fractions of the card: x, y, width, height
rng = np.random.default_rng(7)


def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def save(name, alpha, size):
    img = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8), "L")
    if img.size != size:
        img = img.resize(size, Image.LANCZOS)
    rgba = Image.merge("RGBA", [Image.new("L", size, 255)] * 3 + [img])
    rgba.save(f"{name}.webp", "WEBP", quality=82, alpha_quality=75, method=6)
    print(name, size, round(float(np.asarray(img).mean()) / 255, 3))


def splat(points, width, height):
    """Histogram of points (x, y in pixels) on a width x height canvas."""
    x, y = points
    keep = (x >= 0) & (x < width) & (y >= 0) & (y < height)
    return np.bincount((y[keep].astype(int) * width + x[keep].astype(int)), minlength=width * height).reshape(height, width).astype(float)


# ───────── Reverse holo: the card but its window ─────────

yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)


def outside_window(feather=1.5):
    x0, y0, aw, ah = ART
    r = 0.011 * w
    cx, cy = (x0 + aw / 2) * w, (y0 + ah / 2) * h
    qx, qy = np.abs(xx - cx) - (aw * w / 2 - r), np.abs(yy - cy) - (ah * h / 2 - r)
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    return smooth(-feather * S, feather * S, d)


def edge(d):
    """Anti-aliased fill of a signed distance in pixels (negative inside)."""
    return 1 - smooth(-.75 * S, .75 * S, d)


# The card's energy symbol (deck.js), as the reverse holo of the Sword & Shield cards prints its type's symbol:
# signed distances in pixels from a tile's centre, R the symbol's radius.
def ring_dot(dx, dy, R):                                  # ⊙ Chirikov
    r = np.hypot(dx, dy)
    return np.minimum(np.abs(r - .7 * R) - .12 * R, r - .26 * R)


def florette(dx, dy, R):                                  # ✿ Hopalong: five petals round a hole
    d = np.full(dx.shape, np.inf)
    for k in range(5):
        a = 2 * np.pi * k / 5 - np.pi / 2
        u = (dx * np.cos(a) + dy * np.sin(a)) - .5 * R
        v = -dx * np.sin(a) + dy * np.cos(a)
        d = np.minimum(d, (np.hypot(u / (.46 * R), v / (.3 * R)) - 1) * .3 * R)
    return np.maximum(d, .17 * R - np.hypot(dx, dy))


def propeller(dx, dy, R):                                 # ❋ Popcorn: eight teardrop spokes
    d = np.full(dx.shape, np.inf)
    for k in range(8):
        a = 2 * np.pi * k / 8
        u = dx * np.cos(a) + dy * np.sin(a)
        v = -dx * np.sin(a) + dy * np.cos(a)
        t = np.clip((u - .14 * R) / (.86 * R), 0, 1)
        half = .19 * R * np.sin(np.pi * t) ** .7
        inside = (u > .14 * R) & (u < R)
        d = np.minimum(d, np.where(inside, np.abs(v) - half, np.inf))
    return d


def mosaic(symbol, seed, cols=8):
    """Columns of chevron tiles across the panel, every other column half a tile lower, each tile its own shade
    with the symbol in the middle, set off by a dark gap; a light bevel and a shadow along each chevron."""
    rs = np.random.default_rng(seed)
    x0, width = .034 * w, .932 * w                        # the panel, inside the frame (deck.css: 3.4cqw)
    cw = width / cols
    th, dip, R = cw * 1.05, .3 * cw, .28 * cw
    col = np.clip((xx - x0) // cw, 0, cols - 1)
    cx = x0 + (col + .5) * cw
    off = (col % 2) * th / 2 - dip
    t = (yy - off + dip * (1 - np.abs(xx - cx) / (cw / 2))) / th
    row = np.floor(t)
    frac = t - row
    shades = rs.uniform(.15, 1, (cols, int(h / th) + 4))
    value = shades[col.astype(int), (row + 2).astype(int)]
    value = np.where(frac < .03, .95, np.where(frac > .975, .05, value))
    value = np.where(np.abs(xx - x0 - col * cw) < .6 * S, .05, value)
    d = symbol(xx - cx, yy - ((row + .5) * th + off), R)
    gap = edge(d - 1.8 * S)
    value = value * (1 - gap) + .03 * gap
    return np.maximum(value, edge(d))


def reverse(name, texture, symbol, seed):
    # The map's own texture stays in each tile, faintly etched.
    foil = mosaic(symbol, seed) * (.62 + .38 * np.clip(texture, 0, 1))
    save(f"reverse-{name}", foil * outside_window(), (W, H))


# Chirikov: the phase portrait of the standard map itself, at the card's K. Regular orbits (small Lyapunov
# exponent, as in the render) are drawn whole and close into the invariant curves round the islands; chaotic
# ones only every few steps, as a dust of sparkles on the sea between them.
def chirikov(K=0.971635, orbits=220, iters=5000, periods=1.3):
    tau = 2 * np.pi
    th = rng.random(orbits) * tau
    p = rng.random(orbits) * tau
    dth, dp, lyap = np.ones(orbits), np.zeros(orbits), np.zeros(orbits)
    t, q = th.copy(), p.copy()
    for _ in range(1500):
        dp = dp + K * np.cos(t) * dth
        dth = dth + dp
        q = q + K * np.sin(t)
        t = t + q
        n = np.hypot(dp, dth)
        lyap += np.log(n)
        dp, dth = dp / n, dth / n
    regular = lyap / 1500 < .01
    # One period of the picture as a square tile, then laid over the card with the main island in the middle.
    tile = int(round(w / periods))
    k = tile / tau
    xs, ys, chaotic = [], [], []
    for i in range(iters):
        p = (p + K * np.sin(th)) % tau
        th = (th + p) % tau
        keep = regular | (i % 25 == 0)                    # the chaotic sea only every 25th step
        xs.append(th[keep] * k); ys.append(p[keep] * k); chaotic.append(~regular[keep])
    xs, ys, chaotic = np.concatenate(xs), np.concatenate(ys), np.concatenate(chaotic)
    lines = splat((xs[~chaotic], ys[~chaotic]), tile, tile)
    dust = splat((xs[chaotic], ys[chaotic]), tile, tile)
    curves = np.clip(ndimage.gaussian_filter(lines, .6, mode="wrap") * .8, 0, 1)
    sparkle = np.clip(dust, 0, 1) * rng.uniform(.3, 1, (tile, tile))
    pattern = np.maximum(curves * .9, sparkle)
    rows = (yy[:, 0] - h / 2).astype(int) % tile                   # p = 0 at the centre ...
    cols = ((xx[0] - w / 2) + tile / 2).astype(int) % tile         # ... and θ = π: the main island
    return pattern[np.ix_(rows, cols)]


# Hopalong: its own mandala, blown up so the rings run round the card, as fine sparkle.
def hopalong(a=-55.0, b=-1.0, c=-42.0, n=400_000):
    # One orbit is one sequence, so it runs step by step; a short run is plenty for sparkle.
    pts = np.empty((n, 2))
    x = y = 0.0
    for i in range(n):
        s = (x > 0) - (x < 0)
        x, y = y - s * math.sqrt(abs(b * x - c)), a - x
        pts[i] = x, y
    cx, cy = np.median(pts, axis=0)
    r = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy)
    scale = .62 * h / np.percentile(r, 99)
    dens = splat((w / 2 + (pts[:, 0] - cx) * scale, h / 2 - (pts[:, 1] - cy) * scale), w, h)
    return np.clip(np.log1p(dens) / np.log1p(1.2), 0, 1) * .85


# Popcorn: the tracks of a grid of starts taking their sixty little steps.
def popcorn(hstep=.05, iters=60, span=2.2):
    k = w / (2 * span)                                   # pixels per unit
    gx, gy = np.meshgrid(np.linspace(-span, span, 110), np.linspace(-span * h / w, span * h / w, 154))
    x, y = gx.ravel(), gy.ravel()
    dens = np.zeros((h, w))
    for _ in range(iters):
        x, y = x - hstep * np.sin(y + np.tan(3 * y)), y - hstep * np.sin(x + np.tan(3 * x))
        dens += splat((w / 2 + x * k, h / 2 - y * k), w, h)
    dens = ndimage.gaussian_filter(dens, .6)
    return np.clip(np.log1p(dens) / np.log1p(5), 0, 1) * .9


reverse("chirikov", chirikov(), ring_dot, 101)
reverse("hopalong", hopalong(), florette, 102)
reverse("popcorn", popcorn(), propeller, 103)


# ───────── Amazing rare: the attractor out of its window ─────────
# Geometry of the window (deck.css): the artwork content box is 85.2 x 50.48 cqw; the render (4:3) is drawn
# centred on it at ZOOM times its width, so it overflows the window on every side. Distances below are in cqw.
CW, CH = 85.2, 50.48
AW, AH = 600, 450
ZOOM = {"lorenz": 1.32, "aizawa": 1.36, "halvorsen": 1.3}
BG = np.array([5, 5, 14]) / 255                          # the renders' background (chaos_cards.py)


def outside(zoom, width, height):
    """How far each pixel of the render lies outside the window, in cqw, once drawn over the card."""
    v, u = np.mgrid[0:height, 0:width] / np.array([height, width])[:, None, None]
    X, Y = (u - .5) * CW * zoom, (v - .5) * CW * .75 * zoom
    dx = np.maximum(np.abs(X) - CW / 2, 0)
    dy = np.maximum(np.abs(Y) - CH / 2, 0) * np.where(Y < 0, 1.25, 1.0)       # a little shorter upwards, where the name is
    return np.hypot(dx, dy)


def amazing(name):
    zoom = ZOOM[name]
    # The cut-out: the render with its dark background taken out ("colour to alpha"): the least alpha that
    # explains each pixel as colour over the background, and that colour. Over the window's background it
    # is the render again, pixel for pixel; over the card's panel the threads keep their colour instead of
    # their darkness. Outside the window it fades as it goes. It is the card's picture (deck.js).
    rgb = np.asarray(Image.open(f"../{name}.webp").convert("RGB"), np.float64) / 255
    alpha = ((rgb - BG) / (1 - BG)).clip(0).max(axis=2)
    alpha[alpha < .012] = 0                               # the background's own noise
    colour = BG + (rgb - BG) / np.maximum(alpha, 1e-6)[..., None]
    # The palette changes slowly along the attractor, so the colour can be smooth and the alpha carry the
    # detail (an alpha-weighted blur): the file is then a fraction of the size, and the noise of the faint
    # pixels, amplified when their colour is recovered, is gone.
    colour = ndimage.gaussian_filter(colour * alpha[..., None], (2, 2, 0)) / np.maximum(ndimage.gaussian_filter(alpha, 2), 1e-6)[..., None]
    alpha *= 1 - smooth(2, 15, outside(zoom, *alpha.shape[::-1]))
    rgba = np.dstack([colour.clip(0, 1), alpha]) * 255 + .5
    Image.fromarray(rgba.astype(np.uint8), "RGBA").save(f"cut-{name}.webp", "WEBP", quality=76, alpha_quality=70, method=6)
    print(f"cut-{name}", rgb.shape[1::-1], round(float(alpha.mean()), 3))
    # The splash that carries the glitter: the attractor, widened and softened, reaching a little further.
    small = Image.open(f"../{name}.webp").convert("RGB").resize((AW, AH), Image.LANCZOS)
    lum = ((np.asarray(small, np.float64) / 255) - BG).clip(0).max(axis=2)
    subject = ndimage.grey_dilation(smooth(.05, .25, ndimage.gaussian_filter(lum, 1.5)), size=(11, 11))
    splash = ndimage.gaussian_filter(subject, 5) * (1 - smooth(4, 16, outside(zoom, AW, AH)))
    save(f"splash-{name}", np.clip(splash * 1.3, 0, 1), (AW, AH))


# Glitter: flakes of foil caught at random angles, some catching the light as little four-point stars. The
# tile wraps, so it repeats without seams.
def glitter(size=256, flakes=520, stars=18):
    n = size * S
    canvas = np.zeros((n, n))

    def stamp(cx, cy, reach, shape):
        """Draws shape(dx, dy) into a small window round (cx, cy); the window wraps round the tile."""
        o = np.arange(-reach, reach + 1)
        rows, cols = (int(cy) + o) % n, (int(cx) + o) % n
        dy, dx = np.meshgrid(o + int(cy) - cy, o + int(cx) - cx, indexing="ij")
        patch = canvas[np.ix_(rows, cols)]
        canvas[np.ix_(rows, cols)] = np.maximum(patch, shape(dx, dy))

    for _ in range(flakes):
        r, th, level = rng.uniform(1.1, 2.8) * S, rng.uniform(0, np.pi), rng.uniform(.3, 1)

        def hexagon(dx, dy, r=r, th=th, level=level):
            # the max of three rotated slabs
            d = np.max([np.abs(dx * np.cos(th + k * np.pi / 3) + dy * np.sin(th + k * np.pi / 3)) for k in range(3)], axis=0)
            return level * (1 - smooth(r - .6 * S, r + .6 * S, d))
        stamp(*rng.uniform(0, n, 2), int(r + 2 * S), hexagon)
    for _ in range(stars):
        arm = rng.uniform(4, 9) * S

        def star(dx, dy, arm=arm):
            dx, dy = np.abs(dx), np.abs(dy)
            return np.maximum(np.exp(-(dy / (.5 * S)) ** 2 - (dx / arm) ** 2), np.exp(-(dx / (.5 * S)) ** 2 - (dy / arm) ** 2))
        stamp(*rng.uniform(0, n, 2), int(3 * arm), star)
    save("glitter", canvas, (size, size))


# ───────── The artwork window's foil: the dark space round the attractor ─────────
# For the cards on a dark background (holo rare and amazing rare). As on the first cards' regular holo
# (generate.py), the foil in the window lies on the background and the attractor is cut out of it, widened
# and softened a little; unlike there, its holes (Lorenz's eyes, the lens between the logistic branches, the
# inside of Aizawa's shell) keep their foil, so the window is filled. The mask covers the whole render (4:3):
# deck.css lays it over the picture as the picture is drawn (cover, or the amazing rares' zoom) and paints the
# card's pattern through it.
def art_background(name, size=(720, 540)):
    small = Image.open(f"../{name}.webp").convert("RGB").resize(size, Image.LANCZOS)
    lum = ((np.asarray(small, np.float64) / 255) - BG).clip(0).max(axis=2)
    subject = smooth(.04, .18, ndimage.gaussian_filter(lum, 1.2))
    subject = ndimage.gaussian_filter(ndimage.grey_dilation(subject, size=(7, 7)), 2)
    save(f"art-{name}", 1 - np.clip(subject * 1.15, 0, 1), size)


for card in ZOOM:
    amazing(card)
glitter()
for card in ("halvorsen", "logistic", "lorenz", "aizawa"):
    art_background(card)


# ───────── An etched swirl in the window, as on the Jirachi amazing rare ─────────
# The amazing rare's foil there is etched: fine lines whirling round the subject, cut out round it. Here they
# whirl round Halvorsen's axis, the way the orbit turns on screen (clockwise in this view, from the equations
# integrated and projected as in chaos_cards.py), in arms that trail behind it, waving with its three-fold
# symmetry, broken here and there like an etching; not in the hole round the axis, where they would crowd.
# The centre is the attractor's centroid: the picture is three-fold symmetric about the axis, so its centroid
# lies on it.
def etched_swirl(name, size=(1200, 900), arms=110, wind=1.3, wave=.07):
    rgb = np.asarray(Image.open(f"../{name}.webp").convert("RGB").resize(size, Image.LANCZOS), np.float64) / 255
    lum = (rgb - BG).clip(0).max(axis=2)
    gy, gx = np.mgrid[0:size[1], 0:size[0]].astype(np.float64)
    cx, cy = (gx * lum).sum() / lum.sum(), (gy * lum).sum() / lum.sum()
    r = np.hypot(gx - cx, gy - cy) + 1e-6
    th = np.arctan2(gy - cy, gx - cx)                    # y down: increasing clockwise on screen
    # Arms trailing a clockwise turn fall back (anticlockwise) as they go out.
    phase = arms * (th + wind * np.log(r / size[1]) + wave * np.sin(3 * th)) / (2 * np.pi)
    z = np.exp(2j * np.pi * phase)
    gyz, gxz = np.gradient(z)
    grad = np.hypot(np.abs(gxz), np.abs(gyz)) / (2 * np.pi) + 1e-9   # cycles per pixel
    dist = np.abs(np.angle(z)) / (2 * np.pi) / grad                   # pixels to the nearest line
    lines = (1 - smooth(.35, 1.35, dist)) * smooth(3.5, 7, 1 / grad)  # fade where the lines crowd
    lines *= smooth(.12 * size[1], .22 * size[1], r)  # and leave the hole round the axis to the glitter
    rs = np.random.default_rng(19)
    breaks = ndimage.gaussian_filter(rs.normal(size=(size[1], size[0])), 6)
    breaks = smooth(-.35, .25, breaks / breaks.std())
    subject = smooth(.04, .18, ndimage.gaussian_filter(lum, 1.2 * size[0] / 720))
    subject = ndimage.gaussian_filter(ndimage.grey_dilation(subject, size=(9, 9)), 2.5)
    background = 1 - np.clip(subject * 1.15, 0, 1)
    save(f"etch-{name}", lines * (.35 + .65 * breaks) * background, size)
    print("  swirl centre", round(cx / size[0], 3), round(cy / size[1], 3))


etched_swirl("halvorsen")


# ───────── Paper: the card stock under every card's print ─────────
# Soft clouds, as printed cards' coloured panels are mottled, and a fine grain over them. Noise filtered to a
# 1/f spectrum in Fourier space wraps round, so the tile repeats without seams. Lighter patches are white and
# darker ones black, both faint, so the same tile works on a dark panel and a light one.
def paper(size=512, seed=11):
    rs = np.random.default_rng(seed)
    f = np.fft.fftfreq(size)
    k = np.hypot(*np.meshgrid(f, f))
    k[0, 0] = 1
    clouds = np.real(np.fft.ifft2(np.fft.fft2(rs.normal(size=(size, size))) / k ** 1.5))
    clouds = (clouds - clouds.mean()) / clouds.std()
    n = np.clip(clouds * .5 + rs.normal(size=(size, size)) * .22, -2.2, 2.2) / 2.2
    colour = np.where(n > 0, 255, 0).astype(np.uint8)
    alpha = (np.abs(n) * .26 * 255 + .5).astype(np.uint8)
    Image.fromarray(np.dstack([colour, colour, colour, alpha]), "RGBA").save("paper.webp", "WEBP", quality=82, alpha_quality=80, method=6)
    print("paper", (size, size), round(float(alpha.mean()) / 255, 3))


paper()
