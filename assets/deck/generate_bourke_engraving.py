"""Original stationary micro-engraving for Reuleaux Lace.

Only these two Lace SVG plates are written. No raster dependencies, external assets,
SVG filters or animation: CSS lights the relief and its matching polished cuts.
"""
from pathlib import Path
import math


OUT = Path(__file__).resolve().parent / "foil"


def plate(name, width, height, definitions, placements):
    header = (f'<svg xmlns="http://www.w3.org/2000/svg" '
              f'viewBox="0 0 {width} {height}" preserveAspectRatio="none">\n')
    for polished in (False, True):
        parts = [header, '  <!-- Fixed original engraving; only CSS light moves. -->\n', '  <defs>\n']
        for identity, paths in definitions:
            parts.append(f'    <g id="{identity}" fill="none" stroke-linecap="round" stroke-linejoin="round">\n')
            for path, strength in paths:
                if not polished:
                    parts.append(f'      <path d="{path}" stroke="#5e6875" stroke-width="3.2" opacity="{strength * .42:.3f}"/>\n')
                parts.append(f'      <path d="{path}" stroke="white" stroke-width="{.95 if polished else 1.3}" opacity="{strength:.3f}"/>\n')
            parts.append('    </g>\n')
        parts.append('  </defs>\n')
        if not polished:
            parts.append(f'  <rect width="{width}" height="{height}" fill="#10151d"/>\n')
        for identity, transform in placements:
            parts.append(f'  <use href="#{identity}" transform="{transform}"/>\n')
        parts.append('</svg>\n')
        suffix = "cuts" if polished else "relief"
        target = OUT / f"bourke-{name}-{suffix}.svg"
        target.write_text(''.join(parts))
        print(target.name, target.stat().st_size)


def lace():
    # Three smooth line families, spaced along their own normals. Their
    # crossings form small trefoil/lozenge moiré fields without any large disk.
    definitions, placements = [], []
    for family in range(3):
        points = []
        for step in range(101):
            u = -1100 + step * 22
            v = 19 * math.sin(u/102 + family*1.4) + 7 * math.sin(u/48)
            points.append(f'{u:.1f} {v:.1f}')
        definitions.append((f"wave{family}", [('M' + 'L'.join(points), .52 + .09*family)]))
        for line in range(-47, 48):
            placements.append((f"wave{family}", f"translate(600 450) rotate({(0,60,-60)[family]}) translate(0 {line*19})"))
    plate("lace-weave", 1200, 900, definitions, placements)


if __name__ == "__main__":
    lace()
