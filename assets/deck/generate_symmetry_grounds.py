"""Build neutral foil protection masks from the symmetric maps' real orbits.

White RGB, alpha only: 255 admits foil on the background, 0 protects the
attractor. Every occupied histogram pixel is protected, including its faintest
threads. No palette threshold, decoration or colour image is involved.

Run from the repository root:
    python3 assets/deck/generate_symmetry_grounds.py
Requires NumPy, Pillow and a C compiler. Parameters are read from CASES in
color_symmetry.py without importing or executing that image-generation script.
"""
from pathlib import Path
import argparse
import ast
import subprocess
import tempfile
import time

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parent
FOIL = ROOT / 'foil'
STEPS = 45_000_000
SOURCE_SIZE = (1200, 900)
PORTRAIT_SIZE = (900, 1257)
FULL_ART = {
    'halloween': (1620, -100),
    'french-glass': (900, 38),
    'mayan-bracelet': (1125, -15),
}


def cases():
    """Share the source parameters without running its module-level renderer."""
    tree = ast.parse((ROOT / 'color_symmetry.py').read_text())
    assignment = next(node for node in tree.body if isinstance(node, ast.Assign)
                      and any(isinstance(target, ast.Name) and target.id == 'CASES'
                              for target in node.targets))
    return [case for case in ast.literal_eval(assignment.value)
            if case[0] != 'golden-flintstone']


def smoothstep(start, end, value):
    t = np.clip((value - start) / (end - start), 0, 1)
    return t * t * (3 - 2 * t)


def protected_subject(hist):
    """Keep the whole orbit dark; feather only outside its protected margin."""
    occupied = Image.fromarray(np.uint8(hist > 0) * 255, 'L')
    # Four source pixels of unconditionally clear space around every track.
    core = occupied.filter(ImageFilter.MaxFilter(9))
    feather = core.filter(ImageFilter.GaussianBlur(3))
    protected = np.maximum(np.asarray(core), np.asarray(feather))
    return Image.fromarray(protected, 'L')


def portrait_subject(subject, name):
    """Match the 4:3 source scale and placement in generate_fullart.py."""
    art_w, offset_y = FULL_ART[name]
    art_h = round(art_w * SOURCE_SIZE[1] / SOURCE_SIZE[0])
    scaled = subject.resize((art_w, art_h), Image.Resampling.LANCZOS)
    canvas = Image.new('L', PORTRAIT_SIZE, 0)
    canvas.paste(scaled, ((PORTRAIT_SIZE[0] - art_w) // 2, offset_y))
    return canvas


def save_alpha(name, alpha):
    alpha = np.uint8(np.clip(np.rint(alpha), 0, 255))
    image = Image.new('RGBA', (alpha.shape[1], alpha.shape[0]), 'white')
    image.putalpha(Image.fromarray(alpha, 'L'))
    destination = FOIL / name
    image.save(destination, 'WEBP', lossless=True, exact=True, method=6)
    print(f'{name}: {image.width}x{image.height}, {destination.stat().st_size:,} bytes', flush=True)


def ground(hist, name):
    subject = protected_subject(hist)
    full = name in FULL_ART
    if full:
        subject = portrait_subject(subject, name)
    size = (720, 1006) if full else (800, 600)
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    # Resampling may leave values within one level of the solid core; retain
    # a true zero in that core instead of a barely transparent layer of foil.
    protection = np.asarray(subject, dtype=np.float32)
    protection[protection >= 254] = 255
    alpha = 255 - protection
    if full:
        v = np.arange(size[1], dtype=np.float32)[:, None] / size[1]
        header = .18 + .82 * smoothstep(.10, .15, v)
        lower_text = 1 - .88 * smoothstep(.49, .56, v)
        alpha *= header * lower_text
        assert alpha[:int(size[1] * .10) + 1].max() <= 50
        assert alpha[int(np.ceil(size[1] * .56)):].max() <= 35
    save_alpha(f'ground-{name}.webp', alpha)


def frame_masks(window_only=False):
    width, height = 560, 782
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    u, v = xx / width, yy / height
    quiet_text = (smoothstep(0, .18, u) * (1 - smoothstep(.82, 1, u))
                  * smoothstep(.44, .54, v) * (1 - smoothstep(.91, 1, v)))
    alpha = 255 * (1 - .92 * quiet_text)
    if not window_only:
        save_alpha('frame-full.webp', alpha)
    # Exact rectangular artwork exclusion with a narrow fade outside it.
    distance = np.maximum(np.maximum(.0659 - u, u - .9341),
                          np.maximum(.1054 - v, v - .4783))
    # The pale catalogue strip is printed immediately below the window. Keep
    # its number/credit completely free of foil, feathering outside the strip.
    strip = (smoothstep(.060, .065, u) * (1 - smoothstep(.935, .940, u))
             * smoothstep(.475, .478, v) * (1 - smoothstep(.520, .525, v)))
    save_alpha('frame-window.webp', alpha * smoothstep(0, .004, distance) * (1 - strip))


def main():
    selected = cases()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', choices=[case[0] for case in selected])
    args = parser.parse_args()
    FOIL.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='symmetry-grounds-') as tmp:
        binary, raw = Path(tmp) / 'symmetry', Path(tmp) / 'hist.bin'
        subprocess.run(['cc', '-O3', '-o', str(binary), str(ROOT / 'generate_symmetry.c'), '-lm'], check=True)
        for name, m, lam, a, b, g, omega, _ in selected:
            if args.only and name != args.only:
                continue
            started = time.monotonic()
            print(f'{name}: calculating {STEPS:,} orbit visits', flush=True)
            subprocess.run([str(binary), *map(str, (m, lam, a, b, g, omega, STEPS)),
                            str(raw), '.33'], check=True)
            hist = np.fromfile(raw, dtype=np.uint32).reshape(SOURCE_SIZE[1], SOURCE_SIZE[0])
            if np.count_nonzero(hist) < 1000:
                raise RuntimeError(f'{name}: incomplete orbit')
            ground(hist, name)
            print(f'  completed in {time.monotonic() - started:.1f}s', flush=True)
    frame_masks()


if __name__ == '__main__':
    main()
