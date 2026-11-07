"""Original three-arm brushburst for Clam Triple's printed Amazing-style foil.

The SVG print and alpha plate share exactly the same paths. Brush strokes stay
fixed; CSS lights their foil separately. No reference artwork is included.
Run from any directory with Python 3; no third-party packages are needed.
"""
from math import sin, cos, pi
from pathlib import Path
from random import Random

ROOT = Path(__file__).resolve().parent / 'foil'
rng = Random(3003)
PALETTE = ('#ff2c96', '#ffcb38', '#24dbc5', '#3b8cff', '#8c43d8', '#f36c4e')


def point(radius, angle):
    return 600 + radius * cos(angle), 450 + radius * .73 * sin(angle)


def ribbon(angle, length, width, twist):
    # A curved brush stroke, ragged at the outward end and feather-thin inside.
    left, right = [], []
    for i in range(19):
        t = i / 18
        r = 110 + length * t
        a = angle + twist * (1-t)**1.4
        half = width * sin(pi * (t*.85+.06)) / max(r, 60)
        rough = 1 + .18*sin(i*2.8+angle*11) + .09*sin(i*5.7)
        left.append(point(r, a + half*rough))
        right.append(point(r, a - half*(1+.15*cos(i*3.6))))
    # Three unequal bristles at the broad tip break the silhouette of each stroke.
    tip = [point(110+length+d, angle+o*width/(110+length))
           for d,o in ((14,.9),(-23,.52),(29,.13),(-31,-.22),(8,-.7))]
    pts = left + tip + right[::-1]
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x,y in pts) + ' Z'


def main():
    paths = []
    # Three sprays echo the threefold orbit, with interleaved short dry strokes.
    for arm in range(3):
        for i in range(24):
            a = arm*2*pi/3 + (i/23-.5)*1.82
            length = rng.uniform(320, 445) + 35*sin(i*.83)
            width = rng.uniform(10, 26)
            d = ribbon(a, length, width, rng.uniform(.25,.65))
            paths.append((d, PALETTE[(i//3+arm*2) % len(PALETTE)], rng.uniform(.8,1)))
        for i in range(12):
            a = arm*2*pi/3 + rng.uniform(-.98,.98)
            paths.append((ribbon(a,rng.uniform(290,460),rng.uniform(2,5),.45),
                          PALETTE[(i+arm) % len(PALETTE)], .92))
    # Detached paint flecks make the print spill beyond the rectangular window.
    flecks = []
    for i in range(58):
        a = rng.uniform(0,2*pi)
        x,y = point(rng.uniform(470,558),a)
        flecks.append((x,y,rng.uniform(1.1,4.6),PALETTE[i%len(PALETTE)]))
    header = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="none">\n'
    print_svg = [header, '<!-- Fixed original brushwork; the foil is lit separately. -->\n']
    mask_svg = [header]
    for d,color,opacity in paths:
        print_svg.append(f'<path d="{d}" fill="{color}" opacity="{opacity:.2f}"/>\n')
        mask_svg.append(f'<path d="{d}" fill="white"/>\n')
    for x,y,r,color in flecks:
        geometry = f'cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"'
        print_svg.append(f'<circle {geometry} fill="{color}"/>\n')
        mask_svg.append(f'<circle {geometry} fill="white"/>\n')
    for name,body in [('print-clam-burst.svg',print_svg),('mask-clam-burst.svg',mask_svg)]:
        (ROOT/name).write_text(''.join(body)+'</svg>\n')
        print(name, (ROOT/name).stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
