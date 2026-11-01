"""Rebuild the ten symmetric-icon card images (Pillow + NumPy, a C compiler).
Parameters after Field & Golubitsky, Symmetry in Chaos, table A.1. Each orbit is
plotted into a density histogram; the palettes and decorative backgrounds are
original interpretations and the background lines are not orbit trajectories.
Run from the repository root: python3 assets/deck/color_symmetry.py
"""
from pathlib import Path
import argparse
import hashlib
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# id, m, lambda, alpha, beta, gamma, omega, palette (dark to bright RGB)
CASES = [
    ('swirling-streamers', 4, -1.86, 2, 0, 1, .1, ['10121b','532335','c44e52','f0a080','f8dec0']),
    ('sand-dollar', 5, -2.34, 2, .2, .1, 0, ['f0e8dc','7e3348','b74f5c','258d85','8ce2c8']),
    ('pentagon', 5, 2.6, -2, 0, -.5, 0, ['070c22','173d79','4296b9','b0e4da','f8f1cc']),
    ('halloween', 6, -2.7, 5, 1.5, 1, 0, ['120c1f','542653','d34f3f','f5a53d','fff0a6']),
    ('golden-flintstone', 3, 2.5, -2.5, 0, .9, 0, ['140e20','432238','92572d','d49b46','ffe0a0']),
    ('chaotic-flower', 5, -2.5, 5, -1.9, 1, .188, ['0c1120','55376f','d968a0','ffcaa7','fff4d4']),
    ('french-glass', 9, -2.05, 3, -16.79, 1, 0, ['071821','175a5f','55bca2','b8e7c9','fff1cf']),
    ('pentacle', 5, -2.32, 2.32, 0, .75, 0, ['100d23','303779','7d6cc9','e0a9d6','fff3d5']),
    ('mayan-bracelet', 7, -2.08, 1, -.1, .167, 0, ['100e1a','733b50','d46f63','f5bc83','fff1cc']),
    ('clam-triple', 3, 1.56, -1, .1, -.82, .12, ['07151d','175963','5bb7ae','acd8c1','fff3d9']),
]
root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--only', choices=[case[0] for case in CASES], help='rebuild just one image')
args = parser.parse_args()

def backdrop(name, palette, width=1200, height=900, legacy_clam=False):
    """Illustrated light, independent of the orbit and its measured density."""
    colours = {
        'swirling-streamers': ((150, 55, 115), (60, 133, 177)),
        'sand-dollar': ((151, 50, 79), (30, 139, 132)),
        'pentagon': ((49, 137, 196), (120, 77, 185)),
        'halloween': ((200, 66, 89), (113, 71, 180)),
        'golden-flintstone': ((173, 105, 35), (118, 51, 133)),
        'chaotic-flower': ((172, 74, 151), (74, 117, 195)),
        'french-glass': ((37, 152, 150), (77, 103, 190)),
        'pentacle': ((130, 82, 197), (76, 139, 190)),
        'mayan-bracelet': ((166, 61, 105), (51, 133, 142)),
        'clam-triple': ((30, 145, 153), (105, 76, 172)),
    }
    c1, c2 = (np.array(c, dtype=np.float32) for c in colours[name])
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    x, y = (x-width*.5)/width, (y-height*.5)/height
    if name == 'clam-triple' and not legacy_clam:
        # Deep water, with broad, softly folded ribbons of reflected light.
        # These smooth colour fields replace the thin, repeated orbital lines:
        # the only fine geometry in the scene should belong to the attractor.
        def cloud(cx, cy, sx, sy):
            return np.exp(-((x-cx)**2/sx + (y-cy)**2/sy))

        light = (cloud(-.34, -.10, .065, .16)[..., None] * np.array([5, 43, 46]) +
                 cloud(.36, .24, .09, .12)[..., None] * np.array([21, 23, 55]) +
                 cloud(.02, .03, .22, .18)[..., None] * np.array([2, 13, 19]))
        # Two asymmetrical currents recede into the corners, with no line grid
        # or hard rim around the subject. Their edges dissolve into the water.
        for offset, amplitude, colour in [(-.32, .045, (8, 38, 40)),
                                           (.30, .065, (15, 21, 42))]:
            path = offset + .17*np.sin(3.5*x + offset*2) - .18*x
            ribbon = np.exp(-((y-path)/amplitude)**2) * np.clip((np.abs(x)-.15)*2.6, 0, 1)
            light += ribbon[..., None] * np.array(colour)
        return np.clip(palette[0] + light, 0, 255).astype(np.float32)
    seed = int.from_bytes(hashlib.sha256(name.encode()).digest()[:4], 'little')
    rng = np.random.default_rng(seed)
    dx, dy = rng.uniform(-.09, .09, 2)
    left = np.exp(-((x+.27+dx)**2/.045 + (y+.11+dy)**2/.075))
    right = np.exp(-((x-.27+dy)**2/.07 + (y-.21-dx)**2/.045))
    haze = np.exp(-((x-.03)**2/.24 + (y+.04)**2/.24))
    if name == 'sand-dollar':
        # On pale stock, coloured light darkens the paper instead of glowing against it.
        light = -left[...,None] * np.array([41, 13, 8]) - right[...,None] * np.array([15, 4, 21])
    else:
        light = left[...,None] * c1 * .42 + right[...,None] * c2 * .42 + haze[...,None] * (c1+c2) * .035
    result = np.clip(palette[0] + light, 0, 255)
    scene = Image.fromarray(np.uint8(result), 'RGB').convert('RGBA')
    curves = Image.new('RGBA', (width, height))
    draw = ImageDraw.Draw(curves)
    # A few long curved filaments frame the calculated shape like artwork on a
    # printed card. They are decoration, never extra iterations of the map.
    angles = np.linspace(-.55 * np.pi, (1.8 + rng.uniform(0, .7)) * np.pi, 300)
    ellipse = rng.uniform(.57, .78)
    for n in range(4 + seed % 3):
        radius = np.linspace(250+n*22, 720+n*13, len(angles))
        shift = .16*n + float(dx)
        points = [(width*.5 + np.cos(t+shift)*r, height*.5 + np.sin(t+shift)*r*ellipse)
                  for t, r in zip(angles, radius)]
        colour = colours[name][n % 2]
        draw.line(points, fill=(*colour, 36 if name == 'sand-dollar' else 80), width=2)
    # Small glints live around the margins, preserving the open space inside.
    for _ in range(34):
        px, py = int(rng.integers(14, width-14)), int(rng.integers(14, height-14))
        if ((px-width*.5)/(width*.43))**2 + ((py-height*.5)/(height*.43))**2 < .65:
            continue
        colour = colours[name][int(rng.integers(0, 2))]
        span = int(rng.integers(2, 8))
        draw.line((px-span,py,px+span,py), fill=(*colour, 90), width=1)
        draw.line((px,py-span,px,py+span), fill=(*colour, 90), width=1)
    glow = curves.filter(ImageFilter.GaussianBlur(9))
    scene = Image.alpha_composite(scene, glow)
    scene = Image.alpha_composite(scene, curves)
    return np.asarray(scene.convert('RGB'), dtype=np.float32)

def sand_backdrop(width=1200, height=900):
    """Dark maritime light around Sand Dollar, separate from its orbit palette."""
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    x, y = (x-width*.5)/width, (y-height*.5)/height
    def cloud(cx, cy, sx, sy):
        return np.exp(-((x-cx)**2/sx + (y-cy)**2/sy))
    light = (cloud(-.33, -.12, .08, .16)[..., None] * np.array([7, 39, 37]) +
             cloud(.36, .24, .1, .14)[..., None] * np.array([32, 10, 31]) +
             cloud(.05, -.35, .2, .08)[..., None] * np.array([5, 15, 23]))
    return np.clip(np.array([9, 17, 29]) + light, 0, 255)

with tempfile.TemporaryDirectory(prefix='symmetry-') as tmp:
    binary = Path(tmp) / 'symmetry'
    subprocess.run(['cc', '-O3', '-o', str(binary), str(root / 'generate_symmetry.c'), '-lm'], check=True)
    raw = Path(tmp) / 'hist.bin'
    for name, m, lam, alpha, beta, gamma, omega, colors in CASES:
        if args.only and name != args.only:
            continue
        steps = 45_000_000
        print(name, flush=True)
        # Normal cards use object-fit:cover in a 16:9.6 window (plus a little
        # parallax zoom). Leave room vertically so no part of the orbit is cut.
        # Amazing uses a separately masked 4:3 cut-out and keeps its larger art.
        extent = .46 if name == 'golden-flintstone' else .33
        subprocess.run([str(binary), *map(str, (m,lam,alpha,beta,gamma,omega,steps)), str(raw), str(extent)], check=True)
        hist = np.fromfile(raw, dtype=np.uint32).reshape(900, 1200)
        if name != 'golden-flintstone':
            outside = hist[:107].sum(dtype=np.uint64) + hist[793:].sum(dtype=np.uint64)
            if outside > steps * .0001:
                raise RuntimeError(f'{name}: {outside} hits would fall outside the card window')
        nonzero = hist[hist > 0]
        if nonzero.size < 1000:
            raise RuntimeError(f'{name}: orbit did not fill a recognisable image')
        # Log exposure keeps the finest tracks without allowing the busiest pixel to wash out.
        white = max(float(np.percentile(nonzero, 99.9 if name == 'golden-flintstone' else 99.4)), 2)
        value = np.clip(np.log1p(hist) / np.log1p(white), 0, 1) ** (1.12 if name == 'golden-flintstone' else .8)
        palette = np.array([[int(c[i:i+2], 16) for i in (0,2,4)] for c in colors], dtype=np.float32)
        pos = value * (len(palette)-1)
        lo = np.minimum(pos.astype(np.int32), len(palette)-2)
        mix = (pos-lo)[...,None]
        flat = palette[lo]*(1-mix) + palette[lo+1]*mix
        bg = backdrop(name, palette)
        if name == 'clam-triple':
            # Preserve every original orbit pixel, including the faint tracks:
            # transition to the new background only outside a softened buffer.
            old_bg = backdrop(name, palette, legacy_clam=True)
            subject = Image.fromarray(np.uint8(hist > 0) * 255)
            subject = subject.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(9))
            keep = np.asarray(subject, dtype=np.float32) / 255
            keep[hist > 0] = 1
            bg = bg * (1 - keep[..., None]) + old_bg * keep[..., None]
        rgb = np.uint8(np.clip(flat + (bg - palette[0]) * (1 - value[...,None]), 0, 255))
        if name == 'sand-dollar':
            # The palette is deliberately untouched: even a low-density orbit
            # point keeps its original turquoise or burgundy colour. A narrow
            # feather keeps the silhouette clean against the darker ground.
            subject = Image.fromarray(np.uint8(hist > 0) * 255).copy()
            # Preserve enclosed background pixels within the orbit silhouette,
            # too (for example the tiny bright point at its centre).
            ImageDraw.floodfill(subject, (0, 0), 128)
            subject = Image.fromarray(np.uint8(np.asarray(subject) != 128) * 255)
            subject = subject.filter(ImageFilter.GaussianBlur(.7))
            keep = np.asarray(subject, dtype=np.float32) / 255
            keep[hist > 0] = 1
            rgb = np.uint8(rgb * keep[..., None] + sand_backdrop() * (1 - keep[..., None]))
        Image.fromarray(rgb).save(root / f'{name}.webp', 'WEBP', quality=90, method=6)
        if name == 'golden-flintstone':
            golden_flat = flat

# Golden Flintstone's Amazing Rare: cut the dark ground away and make two
# alpha masks, one around the subject in the window and one for the glitter
# spilling over its rim. Coordinates match deck.css at --zoom: 1.15.
if not args.only or args.only == 'golden-flintstone':
    # The cut-out uses the untextured density render: background glow must never
    # become part of the translucent subject or its foil masks.
    rgb = golden_flat / 255
    bg = np.array([20, 14, 32], dtype=np.float32) / 255
    alpha = np.maximum((rgb - bg) / (1 - bg), 0).max(axis=2).clip(0, 1)
    alpha[alpha < .035] = 0
    h, w = alpha.shape
    y, x = np.mgrid[0:h, 0:w]
    X, Y = (x / w - .5) * 85.2 * 1.15, (y / h - .5) * 85.2 * .75 * 1.15
    distance = np.hypot(np.maximum(np.abs(X) - 85.2 / 2, 0), np.maximum(np.abs(Y) - 50.48 / 2, 0))
    t = np.clip((distance - 2) / 13, 0, 1)
    fade = 1 - t * t * (3 - 2 * t)
    colour = np.clip(bg + (rgb - bg) / np.maximum(alpha[..., None], 1e-6), 0, 1)
    rgba = np.uint8(np.dstack((colour, alpha * fade)) * 255 + .5)
    foil = root / 'foil'
    Image.fromarray(rgba).save(foil / 'cut-golden-flintstone.webp', 'WEBP', quality=85, alpha_quality=90, method=6)
    subject = Image.fromarray(np.uint8(np.clip(alpha * 3, 0, 1) * 255)).resize((600, 450), Image.Resampling.LANCZOS)
    subject = subject.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(5))
    small_fade = np.asarray(Image.fromarray(np.uint8(fade * 255)).resize((600, 450), Image.Resampling.LANCZOS), dtype=np.float32) / 255
    splash = np.uint8(np.asarray(subject, dtype=np.float32) * small_fade)
    mask = Image.new('RGBA', (600, 450), 'white'); mask.putalpha(Image.fromarray(splash))
    mask.save(foil / 'splash-golden-flintstone.webp', 'WEBP', lossless=True, method=6)
    window = Image.fromarray(np.uint8(np.clip(alpha * 5, 0, 1) * 255)).resize((720, 540), Image.Resampling.LANCZOS)
    window = window.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2))
    mask = Image.new('RGBA', (720, 540), 'white'); mask.putalpha(window.point(lambda n: 255 - n))
    mask.save(foil / 'art-golden-flintstone.webp', 'WEBP', lossless=True, method=6)
