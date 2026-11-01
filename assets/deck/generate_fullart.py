"""Compose full-bleed cards from our own symmetric-icon renders.

The source orbit is never stretched: it is centred at its original 4:3 aspect
ratio over a softly painted portrait derived from the same image. The curves,
glints and background below the orbit are decorative, not orbit trajectories.
Run after color_symmetry.py: python3 assets/deck/generate_fullart.py
"""
from pathlib import Path
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
W, H = 900, 1257
CASES = {
    'halloween': ((88, 49, 10), (43, 20, 70), (255, 205, 102), 6),
    'french-glass': ((17, 92, 108), (34, 22, 101), (130, 245, 226), 9),
    'mayan-bracelet': ((113, 39, 83), (17, 66, 105), (255, 190, 148), 7),
}

for index, (name, (colour_a, colour_b, highlight, symmetry)) in enumerate(CASES.items()):
    rng = random.Random(91 + index)
    source = Image.open(ROOT / f'{name}.webp').convert('RGB')
    if name == 'halloween':
        # The black/gold edition uses a gold exposure of the same orbit.
        # Only colour changes; the computed geometry remains untouched.
        pixels = np.asarray(source, dtype=np.float32)
        lum = np.dot(pixels, [0.299, 0.587, 0.114])
        gold = np.stack((lum*1.35, lum*.95, lum*.36), axis=-1)
        source = Image.fromarray(np.uint8(np.clip(gold, 0, 255)))
    # Cover only the background with a blurred version: the orbit itself below is
    # shown at its original aspect ratio, never squashed into portrait geometry.
    enlarged = source.resize((1676, H), Image.Resampling.LANCZOS)
    background = enlarged.crop(((1676-W)//2, 0, (1676+W)//2, H)).filter(ImageFilter.GaussianBlur(65))
    base = np.asarray(background, dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    glow_a = np.exp(-(((xx/W-.18)/.45)**2 + ((yy/H-.23)/.44)**2))
    glow_b = np.exp(-(((xx/W-.85)/.48)**2 + ((yy/H-.72)/.43)**2))
    base = base*.62 + glow_a[...,None]*np.array(colour_a)*.43 + glow_b[...,None]*np.array(colour_b)*.46
    canvas = Image.fromarray(np.uint8(np.clip(base, 0, 255))).convert('RGBA')

    # Light trails and specks form a continuous field above and below the art.
    light = Image.new('RGBA', (W, H))
    draw = ImageDraw.Draw(light)
    col = tuple(highlight)
    for j in range(symmetry):
        theta = 2*math.pi*j/symmetry + .1*index
        points = []
        for k in range(120):
            t = k/119
            angle = theta + 2.9*t
            radius = 185 + 400*t
            points.append((450 + math.cos(angle)*radius, 440 + math.sin(angle)*radius*.78 + 310*t))
        draw.line(points, fill=(*col, 32 + j%3*12), width=2)
    for _ in range(125):
        x, y = rng.randrange(W), rng.randrange(H)
        radius = rng.choice([1, 1, 1, 2])
        alpha = rng.randrange(28, 100)
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(*col, alpha))
        if radius == 2:
            draw.line((x-5, y, x+5, y), fill=(*col, alpha//2), width=1)
            draw.line((x, y-5, x, y+5), fill=(*col, alpha//2), width=1)
    canvas = Image.alpha_composite(canvas, light)

    # The 4:3 orbit is centred in the upper portion, with soft edges that merge
    # into the portrait rather than forming a rectangular illustration window.
    # Halloween is the dramatic black-and-gold edition: let its orbit fill
    # most of the card width and reach behind the text, as on a full-art print.
    art_w = 1620 if name == 'halloween' else 1125 if name == 'mayan-bracelet' else W
    art_h = round(art_w * source.height / source.width)
    art = source.resize((art_w, art_h), Image.Resampling.LANCZOS).convert('RGBA')
    ax = np.arange(art_w)[None, :]
    ay = np.arange(art_h)[:, None]
    edge = np.minimum(np.minimum(ax/100, (art_w-1-ax)/100), np.minimum(ay/100, (art_h-1-ay)/200))
    alpha = np.uint8(np.clip(edge, 0, 1)*255)
    art.putalpha(Image.fromarray(alpha, 'L'))
    canvas.alpha_composite(art, ((W-art_w)//2, -100 if name == 'halloween' else -15 if name == 'mayan-bracelet' else 38))
    canvas.convert('RGB').save(ROOT / f'full-{name}.webp', 'WEBP', quality=88, method=6)

# An original fingerprint-like engraving for the alternate-art foil. Each ridge
# is slightly displaced, so it reads as an etched contour rather than a grid.
mask = Image.new('L', (W*2, H*2), 0)
ridge_draw = ImageDraw.Draw(mask)
for n in range(3, 67):
    radius = n * 6.4
    points = []
    for k in range(181):
        angle = 2 * math.pi * k / 180
        wobble = 1 + .075 * math.sin(3 * angle + n * .12) + .035 * math.cos(5 * angle - n * .07)
        x = 450 + radius * wobble * math.cos(angle)
        y = 610 + radius * 1.28 * wobble * math.sin(angle)
        points.append((round(x*2), round(y*2)))
    ridge_draw.line(points, fill=230, width=5, joint='curve')
mask = mask.resize((W, H), Image.Resampling.LANCZOS)
rgba = Image.new('RGBA', (W, H), 'white')
rgba.putalpha(mask)
rgba.save(ROOT / 'foil' / 'symmetric-ridges.webp', 'WEBP', lossless=True, method=6)
