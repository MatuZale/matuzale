"""Original etched-metal material maps for the ten Symmetry in Chaos cards.

These are monochrome relief inputs, not finished artwork or illumination.
The card shader supplies colour and moving light. All geometry is deterministic;
two-times sampling and Lanczos reduction keep the grooves smooth at card scale.

Run: python3 assets/deck/generate_symmetry_materials.py [--only CARD_ID]
Requires NumPy and Pillow. No downloaded artwork or texture is used.
"""
from pathlib import Path
import argparse
import json
import math

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent / 'foil'
WIDTH, HEIGHT, SUPERSAMPLE = 800, 1120, 2
TAU = 2 * math.pi


def ridge(phase, power=6):
    """Smooth engraved ridge; typical 18–28 px pitch gives 2–5 px highlights."""
    return np.maximum(np.cos(TAU * phase), 0) ** power


def finish(phase, broad=0, secondary=None):
    # A dark cut, a sloping metal face and a narrow polished crest.
    face = (np.sin(TAU * phase) + 1) * .5
    value = 22 + 74 * face + 125 * ridge(phase) + broad
    if secondary is not None:
        value += 25 * ridge(secondary, 5)
    return value


def streamers(x, y):
    # Long, fluid satin grain; several lobes bend the same fine parallel cuts.
    wave = 2.9 * np.sin(2.8*x + 1.2*y) + 1.1*np.sin(5*x - 2.5*y)
    phase = 22*y + wave + .55*np.sin(3.1*y + x)
    broad = 10*np.sin(2.7*x - 1.4*y)
    return finish(phase, broad, 27*y + wave*.8)


def sand_dollar(x, y):
    # A shell fan radiating from a low hinge, crossed by shallow growth rings.
    xx, yy = x-.14, (y-.82)*.86
    r = np.hypot(xx, yy) + .035
    theta = np.arctan2(yy, xx)
    growth = 26*r + .8*np.sin(5*theta + .65*r)
    ribs = 15*theta/math.pi + 1.5*np.sin(2.8*r)
    return finish(growth, 12*np.cos(5*theta)*np.minimum(r, 1), ribs)


def pentagon(x, y):
    # Triangular facets with alternating cut directions, plus fine diamond turns.
    u = (x + y*.35)*6
    v = (y - x*.22)*5
    iu, iv = np.floor(u), np.floor(v)
    fu, fv = u-iu, v-iv
    upper = fu+fv > 1
    facet = np.where(upper, 1-fu, fu)
    orientation = np.sin(iu*2.13 + iv*1.74)
    micro = (x*(24+orientation*3) + y*(15-orientation*8))
    # Broad facet planes remain visible under a glancing highlight.
    # Every crystal plane needs a reflective floor. The former 8/255 valleys
    # vanished after the shader's facet multiplication and contrast.
    value = 64 + 58*facet + 12*np.cos(iu*1.7 + iv*2.3)
    value += 108*ridge(micro, 7)
    edges = np.minimum(np.minimum(fu, 1-fu), np.minimum(fv, 1-fv))
    diagonal = np.abs(fu+fv-1)*.707
    value += 95*np.exp(-np.minimum(edges, diagonal)**2/.0013)
    return value


def halloween(x, y):
    # Sixfold guilloche: a flowing fingerprint whose valleys bend in six lobes.
    # Portrait artwork is centred at 50% / 30%, above the printed rules.
    xx, yy = x, (y+.56)*.86
    r = np.hypot(xx, yy)
    theta = np.arctan2(yy, xx)
    lobes = .085*np.sin(6*theta + .48*np.sin(r*4))*np.minimum(r*2, 1)
    phase = 25*(r + lobes) + .7*np.sin(3.8*x + 2.1*(y+.56))
    return finish(phase, 10*np.cos(6*theta)*np.minimum(r*2, 1), phase + .24 + .9*np.sin(r*3))


def golden_flintstone(x, y):
    # Folded metallic islands. Intersecting smooth folds create broad irregular
    # creases instead of dots; very fine striations give the fold faces grain.
    a = np.sin(3.6*x + 2.1*y) + .47*np.sin(7.1*x - 4.3*y + .6)
    b = np.cos(4.2*y - 2.8*x) + .39*np.cos(9.3*y + 3.1*x)
    c = np.sin(6.2*x - 5.4*y + 1.3) + .22*np.sin(14*x + 8*y)
    fold = np.abs(a) + .62*np.abs(b) + .24*np.abs(c)
    crease = np.exp(-(a/.095)**2) + .65*np.exp(-(b/.11)**2)
    plane = .5 + .5*np.sin(fold*4.2 + x*.8)
    grain = ridge(19*(x+y*.62) + fold*3.3, 6)
    return 23 + 94*plane + 90*np.minimum(crease, 1) + 32*grain


def chaotic_flower(x, y):
    # Five spiral petals, with a second offset wave family in their troughs.
    r = np.hypot(x, y*.86)
    theta = np.arctan2(y*.86, x)
    warp = 2.5*np.sin(5*theta - r*3.2)*np.minimum(r*1.8, 1)
    phase = 25*r + warp
    cross = 19*r - 1.9*np.cos(5*theta + r*2.1)*np.minimum(r*1.8, 1)
    return finish(phase, 12*np.sin(5*theta-r*2)*np.minimum(r, 1), cross)


def french_glass(x, y):
    # A leaded irregular mosaic. Each pane has its own engraved grain angle.
    # Seed locations have a bounded deterministic offset, never pixel noise.
    nearest = np.full(x.shape, np.inf, dtype=np.float32)
    second = np.full(x.shape, np.inf, dtype=np.float32)
    cell = np.zeros(x.shape, dtype=np.int16)
    seeds = []
    for row in range(-1, 9):
        for col in range(-1, 7):
            ident = len(seeds)
            sx = -.98 + col*.39 + .08*math.sin(row*2.7+col*1.4)
            sy = -1.38 + row*.38 + .08*math.cos(col*2.4-row*1.7)
            seeds.append((sx, sy))
            d = (x-sx)**2 + (y-sy)**2
            better = d < nearest
            second = np.where(better, nearest, np.minimum(second, d))
            nearest = np.minimum(nearest, d)
            cell = np.where(better, ident, cell)
    angle = np.sin(cell*2.173)*math.pi
    grain = 28*(x*np.cos(angle) + y*np.sin(angle))
    plane = 40 + 27*(np.sin(cell*3.17)+1) + 18*np.sin(x*3+y*2+cell)
    seam = np.exp(-((np.sqrt(second)-np.sqrt(nearest))/.014)**2)
    return plane + 106*ridge(grain, 7) + 90*seam


def pentacle(x, y):
    # Sharp fivefold folds. Distance to a five-point star is sampled as dense
    # nested engraved terraces rather than a single decorative star outline.
    r = np.hypot(x, y*.9)
    theta = np.arctan2(y*.9, x)-math.pi/2
    sector = np.mod(theta+math.pi/5, TAU/5)-math.pi/5
    star_radius = .61 + .32*(1-np.abs(sector)/(math.pi/5))
    phase = 23*r/star_radius
    fold = 12*np.cos(5*theta)*np.minimum(r*2, 1)
    return finish(phase, fold, phase*.72 + theta*2.5/math.pi)


def mayan_bracelet(x, y):
    # Seven intertwined families of concentric guilloche, rounded and smooth.
    # Match the full-art ring's centre at 50% / 32% of the portrait.
    r = np.hypot(x, (y+.504)*.86)
    theta = np.arctan2((y+.504)*.86, x)
    phase = 25*r + 1.25*np.sin(7*theta + r*2.4)*np.minimum(r*1.6, 1)
    cross = 22*np.hypot(x-.27, (y+.174)*.91) - .8*np.sin(7*theta)
    return finish(phase, 8*np.cos(7*theta)*np.minimum(r, 1), cross)


def clam_triple(x, y):
    # Pearl lamellae: wide rolling nacre bands with tightly nested growth lines.
    fold = .19*np.sin(2.5*x + .7*y) + .065*np.sin(5*x - 1.4*y)
    growth = y + fold + .065*x*x
    phase = 25*growth + .65*np.sin(3.8*y - x)
    broad = 14*np.sin(8*growth) + 6*np.cos(4*x+3*y)
    return finish(phase, broad, 31*growth + .4*np.sin(y*6))


DESIGNS = {
    'swirling-streamers': streamers,
    'sand-dollar': sand_dollar,
    'pentagon': pentagon,
    'halloween': halloween,
    'golden-flintstone': golden_flintstone,
    'chaotic-flower': chaotic_flower,
    'french-glass': french_glass,
    'pentacle': pentacle,
    'mayan-bracelet': mayan_bracelet,
    'clam-triple': clam_triple,
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', choices=DESIGNS)
    args = parser.parse_args()
    yy, xx = np.mgrid[0:HEIGHT*SUPERSAMPLE, 0:WIDTH*SUPERSAMPLE].astype(np.float32)
    x = (xx+.5)/(WIDTH*SUPERSAMPLE)*2-1
    y = ((yy+.5)/(HEIGHT*SUPERSAMPLE)*2-1)*1.4
    for name, design in DESIGNS.items():
        if args.only and args.only != name:
            continue
        raw = np.clip(design(x, y), 15, 232)
        # Keep comparable mid-tones while preserving each material's relief.
        mean = float(raw.mean())
        raw = np.clip(raw + np.clip(91-mean, -16, 16), 12, 232)
        image = Image.fromarray(np.uint8(raw+.5), 'L')
        image = image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).convert('RGB')
        path = ROOT/f'material-{name}.webp'
        # The shader magnifies contrast, so favour a clean high-quality encode,
        # then lower quality only for particularly elaborate facet plates.
        for quality in (82, 76, 70, 64, 58, 52, 46):
            image.save(path, 'WEBP', quality=quality, method=6)
            if path.stat().st_size <= 120_000:
                break
        decoded = np.asarray(Image.open(path).convert('L'))
        print(json.dumps({'id':name, 'bytes':path.stat().st_size, 'quality':quality, 'mean':round(float(decoded.mean()),2),
                          'p05':int(np.percentile(decoded,5)), 'p95':int(np.percentile(decoded,95)),
                          'min':int(decoded.min()), 'max':int(decoded.max())}), flush=True)


if __name__ == '__main__':
    main()
