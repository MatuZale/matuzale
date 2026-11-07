"""Reproduce six original Thorn / Reuleaux escape-time card illustrations.

Requires Python, NumPy, Pillow and a C compiler. Run from any directory:
    python3 assets/deck/generate_bourke.py
    python3 assets/deck/generate_bourke.py --only thorn-rose

The mathematical recurrences were read from Paul Bourke's descriptions:
https://paulbourke.net/fractals/thorn/ (Andrew Wayne Graff; May 2004 / May 2012)
https://paulbourke.net/fractals/triangle/ (inspired by Chris Thomasson; July 2019)
No reference images or reference implementation are used. Reuleaux Lace and
Nebula deliberately vary phi from the source's -1.7/3; their parameters are
recorded below. These are escape-time images of initial conditions, not plots
of a single attractor orbit, nor claims that the boundary has constant width.

Colour encodes interpolated escape time. A small contour modulation and glow
are derived from that same scalar field; the only added background is broad
light and a vignette. Alpha masks protect the high-iteration structure from
foil, and portrait masks additionally protect the lower text panel.
"""
from pathlib import Path
import argparse
import json
import math
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
FOIL = ROOT / "foil"
MAXITER = 500
BAILOUT = 10000
CASES = [
    dict(id="thorn-rose", title="Thorn Rose", family=0, c=(.102, -.04), centre=(1.5, 0), span=5.4, rotation=math.pi/2,
         levels=(5.5, 36), palette=["080e1b", "22213d", "682449", "b13e60", "ed7c87", "ffc5aa", "fff2db"]),
    dict(id="thorn-crown", title="Thorn Crown", family=0, c=(1.098, 1.402), centre=(1.5, 0), span=5.4, rotation=math.pi/2,
         levels=(6.5, 20), palette=["071914", "123f39", "4c6150", "987241", "d8a64f", "ffe092", "fff6d6"], portrait=True),
    dict(id="thorn-tide", title="Thorn Tide", family=0, c=(-.354, .162), centre=(1.5, 0), span=5.4, rotation=math.pi/2,
         levels=(5.5, 26), palette=["08101e", "123752", "1e6b83", "41a8ad", "95d6c7", "e2edcb", "fff6e1"]),
    dict(id="reuleaux", title="Reuleaux", family=1, c=(-1.7/3, 0), centre=(0, 0), span=4.8, rotation=0,
         levels=(3.4, 17), palette=["090d20", "17234e", "4a3d7c", "a57165", "ecb868", "ffe3a6", "fff7df"]),
    dict(id="reuleaux-lace", title="Reuleaux Lace", family=1, c=(-.48, 0), centre=(-.30, .35), span=2.2, rotation=0,
         levels=(4.2, 22), palette=["070f20", "1c385c", "435498", "8a6fbe", "66bad0", "c0e9e7", "f5ffed"]),
    dict(id="reuleaux-nebula", title="Reuleaux Nebula", family=1, c=(-.45, .16), centre=(0, 0), span=4.8, rotation=0,
         levels=(3.4, 19), palette=["100a22", "282353", "663575", "b24c99", "eb7a9d", "ffc7b0", "fff2da"], portrait=True),
]


def smoothstep(a, b, value):
    t = np.clip((value-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


def palette_image(value, palette):
    colours = np.array([[int(c[n:n+2], 16) for n in (0, 2, 4)] for c in palette], np.float32)
    p = np.clip(value, 0, 1)*(len(colours)-1)
    lo = np.minimum(p.astype(np.int32), len(colours)-2)
    mix = (p-lo)[..., None]
    return colours[lo]*(1-mix)+colours[lo+1]*mix


def render(case, binary, raw, sample=2):
    w, h = 1200*sample, 900*sample
    subprocess.run([str(binary), *map(str, (case["family"], w, h, MAXITER, BAILOUT,
                    *case["c"], *case["centre"], case["span"], case["rotation"])), str(raw)], check=True)
    field = np.fromfile(raw, np.float32).reshape(h, w, 4)
    t = field[..., 0]
    low, high = case["levels"]
    value = np.clip((t-low)/(high-low), 0, 1)
    if case["family"] == 1:
        # A logarithmic exposure preserves both large circular voids and the
        # lace of tiny escape-time boundaries deep inside their triangular rim.
        value = np.log1p(value*8)/np.log(9)
    else:
        value = value**.86
    value *= field[..., 3]
    # Thin, soft contour bands use real escape-time level sets.
    contour = (.5+.5*np.cos(t*math.tau))**14
    value = np.clip(value*(.91+.09*contour), 0, 1)
    rgb = palette_image(value, case["palette"])
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx, yy = (xx/w-.5)*2, (yy/h-.5)*2
    envelope = 1-.80*smoothstep(.74, 1.25, np.hypot(xx*.82, yy*.95))
    base = np.array([int(case["palette"][0][n:n+2], 16) for n in (0, 2, 4)], np.float32)
    rgb = base+(rgb-base)*envelope[..., None]
    image = Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).resize((1200, 900), Image.Resampling.LANCZOS)
    # Modest local light comes exclusively from the computed bright structure.
    glow = image.filter(ImageFilter.GaussianBlur(5))
    pixels = np.asarray(image, np.float32)
    halo = np.maximum(np.asarray(glow, np.float32)-base*1.5, 0)
    image = Image.fromarray(np.uint8(np.clip(pixels+halo*.12, 0, 255)))
    protection = smoothstep(.12, .66, value)*envelope
    subject = Image.fromarray(np.uint8(protection*255)).resize((800, 600), Image.Resampling.LANCZOS)
    subject = subject.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.65))
    return image, subject


def save_mask(path, subject, lower_text=False):
    alpha = 255-np.asarray(subject, np.float32)
    if lower_text:
        yy = np.arange(subject.height, dtype=np.float32)[:, None]/subject.height
        alpha *= (1-.91*smoothstep(.47, .56, yy))
        alpha *= .22+.78*smoothstep(.08, .15, yy)
    mask = Image.new("RGBA", subject.size, "white")
    mask.putalpha(Image.fromarray(np.uint8(np.clip(alpha, 0, 255))))
    mask.save(path, "WEBP", lossless=True, exact=True, method=6)


def portrait(image, subject, case):
    width, height = 900, 1257
    base = np.array([int(case["palette"][0][n:n+2], 16) for n in (0, 2, 4)], np.float32)
    pixels = np.broadcast_to(base, (height, width, 3)).copy()
    art = np.asarray(image.resize((900, 675), Image.Resampling.LANCZOS), np.float32)
    y = np.arange(675, dtype=np.float32)[:, None]+45
    fade = (1-smoothstep(550, 745, y))*(.35+.65*smoothstep(40, 150, y))
    pixels[45:720] = base+(art-base)*fade[..., None]
    result = Image.fromarray(np.uint8(np.clip(pixels, 0, 255)))
    protection = Image.new("L", (width, height), 0)
    scaled = subject.resize((900, 675), Image.Resampling.LANCZOS)
    scaled = Image.fromarray(np.uint8(np.asarray(scaled, np.float32)*fade))
    protection.paste(scaled, (0, 45))
    return result, protection.resize((720, 1006), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=[c["id"] for c in CASES])
    parser.add_argument("--sample", type=int, default=2, choices=(1, 2, 3, 4), help="linear supersampling (default 2)")
    args = parser.parse_args()
    FOIL.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="bourke-cards-") as tmp:
        binary, raw = Path(tmp)/"render", Path(tmp)/"field.bin"
        subprocess.run(["cc", "-O3", "-o", str(binary), str(ROOT/"generate_bourke.c"), "-lm"], check=True)
        for case in CASES:
            if args.only and args.only != case["id"]:
                continue
            print(case["id"], flush=True)
            image, subject = render(case, binary, raw, args.sample)
            image.save(ROOT/f'{case["id"]}.webp', "WEBP", quality=94, method=6)
            save_mask(FOIL/f'ground-{case["id"]}.webp', subject)
            if case.get("portrait"):
                image, subject = portrait(image, subject, case)
                image.save(ROOT/f'full-{case["id"]}.webp', "WEBP", quality=94, method=6)
                save_mask(FOIL/f'ground-full-{case["id"]}.webp', subject, lower_text=True)
    # An inspectable manifest prevents display captions drifting from the maths.
    manifest = dict(max_iterations=MAXITER, bailout_radius=BAILOUT, supersampling=args.sample,
                    standard_size=[1200, 900], portrait_size=[900, 1257], cases=CASES)
    (ROOT/"bourke-renders.json").write_text(json.dumps(manifest, indent=2)+"\n")


if __name__ == "__main__":
    main()
