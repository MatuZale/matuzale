"""Draw individual ornamental foil plates for the ten symmetric icon cards.

Each design is a small original engraving inspired by its card, rather than a
second picture of the attractor. Alpha is cut out at the illustration window
and attenuated behind the rules. Requires NumPy and Pillow.
Run: python3 assets/deck/generate_icon_foils.py
"""
import argparse
from math import cos, sin, pi
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent / 'foil'
W, H = 560, 782


def path(draw, points, fill=220, width=3, closed=False):
    if not getattr(draw, 'supersampled', False):
        points = [(round(x), round(y)) for x, y in points]
    if closed:
        points.append(points[0])
    draw.line(points, fill=fill, width=width, joint='curve')


def polygon(cx, cy, radius, n, rotation=-pi / 2):
    return [(cx + radius * cos(rotation + i * 2*pi/n),
             cy + radius * sin(rotation + i * 2*pi/n)) for i in range(n)]


def line_curve(draw, fn, start, end, steps=160, fill=220, width=3):
    path(draw, [fn(t) for t in np.linspace(start, end, steps)], fill, width)


def ring(draw, x, y, rx, ry, fill=220, width=3):
    draw.ellipse((x-rx, y-ry, x+rx, y+ry), outline=fill, width=width)


def stars(draw, x, y, radius, rays=4, fill=220):
    points = []
    for i in range(rays * 2):
        r = radius if i % 2 == 0 else radius * .22
        a = -pi/2 + i*pi/rays
        points.append((x + cos(a)*r, y + sin(a)*r))
    draw.polygon(points, fill=fill)


def ribbons(d):
    # Broad inlaid ribbons cross the lower stock like a reverse-foil mosaic.
    for k in range(4):
        pts = [(x, 520 + k*63 + 30*sin(x/115 + k*.7)) for x in range(0, W+1, 5)]
        pts += [(x, 540 + k*63 + 30*sin(x/115 + k*.7)) for x in range(W, -1, -5)]
        d.polygon(pts, fill=75 + k*12)
    # Fine paired streamers curl up from alternating corners.
    for side in (-1, 1):
        for k in range(5):
            x0 = (38 if side == 1 else W-38) + side*k*13
            line_curve(d, lambda t: (x0 + side*(68*sin(t*1.1) + 24*t),
                                      800 - 165*t + 24*cos(t*1.5+k*.17)),
                       0, 2.35, fill=235-k*20, width=4 if k in (0, 4) else 2)
    for x, y, r in [(32, 440, 5), (520, 512, 7), (47, 716, 4), (509, 747, 5)]:
        stars(d, x, y, r, fill=220)


def shells(d):
    # A reverse-print field of embossed shell coins, with pearled borders.
    for row, y in enumerate((456, 533, 610, 687)):
        for x in range(48 + (row % 2)*42, W, 84):
            ring(d, x, y, 29, 29, 125, 2)
            for a in np.linspace(0, 2*pi, 5, endpoint=False):
                ring(d, x+12*cos(a), y+12*sin(a), 6, 10, 160, 2)
            d.ellipse((x-3, y-3, x+3, y+3), fill=190)
    # A border of scallops, pearl dots and delicate five-petal shell stamps.
    for x in (23, W-23):
        for y in range(38, H, 53):
            ring(d, x, y, 15, 23, 195, 2)
            ring(d, x, y, 7, 12, 220, 2)
            d.ellipse((x-2, y-2, x+2, y+2), fill=240)
    for x in (74, W-74):
        for y in (455, 683):
            for a in np.linspace(0, 2*pi, 5, endpoint=False):
                ring(d, x+12*cos(a), y+12*sin(a), 6, 9, 220, 2)
            ring(d, x, y, 4, 4, 240, 2)
    for x in range(62, W-50, 22):
        d.ellipse((x-2, 748, x+2, 752), fill=190)


def facets(d):
    # Larger mosaic of bevelled five-sided glass, unlike the organic shell print.
    for row, y in enumerate((470, 555, 640, 725)):
        for x in range(28 + (row % 2)*46, W+30, 92):
            p = polygon(x, y, 42, 5)
            d.polygon(p, fill=60 + (row % 2)*25)
            path(d, p, 165, 2, True)
            for px, py in p:
                path(d, [(x, y), (px, py)], 125, 2)
    # Interlocking pentagonal cut-glass edges and clipped triangular facets.
    for x in (5, W-5):
        for y in (80, 190, 300, 410, 520, 630, 740):
            for r in (34, 24):
                path(d, polygon(x, y, r, 5), 225, 3, True)
            for px, py in polygon(x, y, 34, 5):
                path(d, [(x, y), (px, py)], 135, 2)
    for x in range(70, 520, 60):
        path(d, [(x, 756), (x+30, 725), (x+60, 756), (x+30, 766)], 220, 2, True)


def lantern(d):
    # The m=6 map creates six-fold interlaced filaments in the lantern.
    # Continue their six rotated curved ribs and rosette-shaped level curves
    # into the surrounding card stock, while keeping the image itself clear.
    cx, cy = W/2, H*.29
    for radius in (165, 185, 205, 225, 246, 267, 288, 309, 330):
        line_curve(d, lambda t, r=radius: (cx + r*(1+.10*cos(6*t))*cos(t),
                                          cy + r*(1+.10*cos(6*t))*sin(t)),
                   0, 2*pi, 300, 205, 3 if radius % 2 else 2)
    for arm in range(6):
        a = arm*pi/3
        for offset in (-.12, -.06, 0, .06, .12):
            line_curve(d, lambda t, a=a, offset=offset: (
                cx + t*cos(a + offset + .19*sin((t-125)/210*pi)),
                cy + t*sin(a + offset + .19*sin((t-125)/210*pi))),
                105, 360, 160, 215, 2)
    for x in (100, 190, 370, 460):
        stars(d, x, 744, 10, 6, 170)


def shards(d):
    # Irregular drops and translucent pools of Amazing Rare foil, arranged
    # outside the portrait. Their hues come from the moving conic spectrum.
    pools = [
        [(0,465),(18,451),(38,459),(44,477),(66,489),(58,505),(38,506),(29,526),(7,521)],
        [(W,525),(W-24,512),(W-41,520),(W-49,538),(W-70,548),(W-60,566),(W-40,568),(W-25,587),(W,580)],
        [(0,660),(19,643),(38,651),(47,670),(69,676),(78,692),(62,706),(43,703),(33,720),(10,716),(0,726)],
        [(W,674),(W-20,658),(W-36,662),(W-48,678),(W-69,681),(W-76,695),(W-61,708),(W-39,710),(W-28,726),(W,716)],
        [(76,748),(92,730),(116,735),(133,726),(153,738),(168,733),(186,750),(174,766),(140,760),(122,772),(100,761)],
        [(360,750),(375,731),(397,737),(418,727),(435,738),(457,734),(477,749),(469,763),(444,764),(424,775),(406,764),(382,770)],
    ]
    for i, points in enumerate(pools):
        d.polygon(points, fill=165 + i%3*25)
        path(d, points, 230, 2, True)
    for x,y,r in ((33,428,5),(58,438,3),(506,484,6),(530,495,4),(84,619,6),
                  (50,620,3),(480,630,5),(512,636,3),(215,751,5),(327,746,4)):
        d.ellipse((x-r,y-r,x+r,y+r), fill=220)


def flowers(d):
    # A loose spray of individual petals, not a repeated grid.
    for cx, cy, size in ((82, 520, 30), (468, 578, 37), (145, 710, 28), (404, 698, 31)):
        for a in np.linspace(0, 2*pi, 5, endpoint=False):
            petal = [(cx, cy)]
            for t in np.linspace(0, pi, 36):
                petal.append((cx+size*cos(a)*sin(t)+size*.28*cos(a+pi/2)*sin(2*t),
                              cy+size*sin(a)*sin(t)+size*.28*sin(a+pi/2)*sin(2*t)))
            d.polygon(petal, fill=90)
            path(d, petal, 185, 2)
        ring(d, cx, cy, 4, 4, 220, 2)
    # Asymmetric climbing stems and offset blossoms with airy engraved petals.
    for side in (1, -1):
        x = 23 if side == 1 else W-23
        line_curve(d, lambda t: (x+side*(15+19*sin(t*2.3)), 770-t*350), 0, 1, fill=230, width=3)
        for y in (478, 590, 705):
            cx = x + side*(18 if y != 590 else 32)
            for a in np.linspace(0, 2*pi, 5, endpoint=False):
                ex, ey = cx+18*cos(a), y+18*sin(a)
                line_curve(d, lambda t, a=a: (cx+18*cos(a)*sin(t)+7*cos(a+pi/2)*sin(2*t),
                                               y+18*sin(a)*sin(t)+7*sin(a+pi/2)*sin(2*t)),
                           0, pi, 60, 220, 2)
            ring(d, cx, y, 3, 3, 230, 2)
        for y in (550, 660, 740):
            path(d, [(x+side*18,y), (x+side*43,y-12), (x+side*31,y+8), (x+side*18,y)], 190, 2)


def stained_glass(d):
    # Offset jewel tiles with leading, curved rose-window outlines and corners.
    for side in (0, 1):
        x = 12 if side == 0 else W-12
        s = 1 if side == 0 else -1
        for y in range(25, H, 70):
            path(d, [(x,y), (x+s*31,y+18), (x+s*22,y+48), (x,y+63)], 235, 3, True)
            path(d, [(x,y), (x+s*22,y+48)], 145, 2)
            d.ellipse((x+s*12-3, y+28-3, x+s*12+3, y+28+3), fill=180)
    for x in range(90, 500, 56):
        path(d, [(x,729), (x+28,743), (x,757), (x-28,743)], 190, 2, True)


def constellations(d):
    # Two pentagram seals with a constellation of dotted connecting paths.
    for x, y in ((45, 515), (W-45, 660), (120, 738)):
        for r in (40, 47):
            ring(d, x, y, r, r, 220, 2)
        p = polygon(x, y, 34, 5)
        path(d, [p[i] for i in (0, 2, 4, 1, 3, 0)], 235, 2)
    for x, y, r in ((25, 105, 6), (530, 220, 10), (32, 344, 8), (525, 450, 6),
                    (100, 744, 6), (200, 737, 8), (305, 751, 5), (420, 739, 9)):
        stars(d, x, y, r, fill=230)
    for x in range(120, 445, 15):
        d.ellipse((x, 748, x+2, 750), fill=150)


def bracelet(d):
    # Seven overlapping oval links form a second, open bracelet around the
    # rules. Each double ring is tangent to an elliptical seven-link path.
    cx, cy = W/2, 582
    for i in range(7):
        a = -pi/2 + 2*pi*i/7
        x, y = cx + 214*cos(a), cy + 151*sin(a)
        tangent = np.arctan2(151*cos(a), -214*sin(a))
        for rx, ry, stroke in ((49, 32, 5), (41, 24, 2)):
            line_curve(d, lambda t, x=x, y=y, rx=rx, ry=ry, a=tangent:
                       (x + rx*cos(t)*cos(a) - ry*sin(t)*sin(a),
                        y + rx*cos(t)*sin(a) + ry*sin(t)*cos(a)),
                       0, 2*pi, 120, 235, stroke)
        stars(d, x, y, 5, 4, 210)
    # Jewel-like bezels down the edges echo the links of the central ring.
    for side in (0, 1):
        x = 18 if side == 0 else W-18
        for y in range(20, H, 48):
            ring(d, x, y, 16, 21, 235, 5)
            ring(d, x, y+24, 10, 18, 185, 4)


def tides(d):
    # Three offset sets of wave arcs and pinprick bubbles.
    for side in (0, 1):
        x = -35 if side == 0 else W+35
        for y in (160, 420, 680):
            for k in range(6):
                ring(d, x, y, 42+k*10, 27+k*7, 225-k*15, 2)
    for x, y, r in ((33, 52, 4), (39, 255, 5), (22, 555, 4), (528, 90, 5),
                    (524, 330, 4), (519, 575, 6), (100, 746, 4), (330, 741, 5), (465, 746, 4)):
        ring(d, x, y, r, r, 220, 2)
    for k in range(3):
        line_curve(d, lambda t: (65+430*t, 755-k*9+7*sin(2*pi*t+k*.6)), 0, 1, 150, 200, 2)


DESIGNS = {
    'swirling-streamers': ribbons,
    'sand-dollar': shells,
    'pentagon': facets,
    'halloween': lantern,
    'golden-flintstone': shards,
    'chaotic-flower': flowers,
    'french-glass': stained_glass,
    'pentacle': constellations,
    'mayan-bracelet': bracelet,
    'clam-triple': tides,
}


def smoothstep(a, b, value):
    t = np.clip((value-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


class SupersampledDraw:
    """Scale the original coordinates before drawing, keeping curves smooth."""
    supersampled = True

    def __init__(self, image, scale):
        self.draw, self.scale = ImageDraw.Draw(image), scale

    def points(self, points):
        return [(round(x*self.scale), round(y*self.scale)) for x, y in points]

    def line(self, points, fill, width, joint):
        self.draw.line(self.points(points), fill=fill, width=width*self.scale, joint=joint)

    def ellipse(self, box, **kwargs):
        if 'width' in kwargs:
            kwargs['width'] *= self.scale
        self.draw.ellipse(tuple(round(n*self.scale) for n in box), **kwargs)

    def polygon(self, points, **kwargs):
        self.draw.polygon(self.points(points), **kwargs)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--only', choices=DESIGNS, help='rebuild one plate')
args = parser.parse_args()

for name, design in DESIGNS.items():
    if args.only and name != args.only:
        continue
    # The chain's fine, curved links are noticeable at inspection size. Draw
    # at 4x and retain a 2x plate with antialiased edges for high-DPI displays.
    output_scale = 2 if name == 'mayan-bracelet' else 1
    image = Image.new('L', (W*output_scale, H*output_scale), 0)
    if output_scale == 2:
        image = Image.new('L', (W*4, H*4), 0)
        design(SupersampledDraw(image, 4))
        image = image.resize((W*2, H*2), Image.Resampling.LANCZOS)
    else:
        design(ImageDraw.Draw(image))
    out_w, out_h = image.size
    y, x = np.mgrid[0:out_h, 0:out_w].astype(np.float64)
    u, v = x / out_w, y / out_h
    # Preserve the artwork and attenuate the ornament behind the rules.
    art = (u >= .0659) & (u <= .9341) & (v >= .1054) & (v <= .4783)
    text = (smoothstep(.07, .17, u) * (1-smoothstep(.83, .93, u)) *
            smoothstep(.49, .56, v) * (1-smoothstep(.94, .98, v)))
    readability = 1 - .74*text
    pixels = np.asarray(image, dtype=np.float64) * readability
    pixels = np.where(art, 0, pixels)
    alpha = Image.fromarray(np.uint8(np.clip(pixels, 0, 255)), 'L')
    mask = Image.new('RGBA', image.size, 'white')
    mask.putalpha(alpha)
    mask.save(ROOT / f'icon-{name}.webp', 'WEBP', lossless=True, method=6)
    central_text = np.asarray(alpha)[int(out_h*.58):int(out_h*.90), int(out_w*.19):int(out_w*.81)]
    print(name, 'text max', int(central_text.max()), 'visible pixels', int(np.count_nonzero(alpha)))
