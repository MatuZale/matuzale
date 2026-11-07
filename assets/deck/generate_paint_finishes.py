"""Original ink pools and palette-knife paint for two mathematical cards.

Rebuild with: python3 assets/deck/generate_paint_finishes.py
Only the six named SVG assets are written. All geometry is deterministic and
uses Python's standard library; no downloaded images, noise filters or orbit
modifications. The print, silhouette and raised ridges share source geometry.
"""
from math import cos, sin, hypot
from pathlib import Path
from random import Random

ROOT = Path(__file__).resolve().parent / 'foil'
HEADER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="none">\n'


def path(d, fill, **attrs):
    extra = ''.join(f' {key.replace("_", "-")}="{value}"' for key, value in attrs.items())
    return f'<path d="{d}" fill="{fill}"{extra}/>\n'


def polygon(points):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in points) + ' Z'


def write(name, body):
    destination = ROOT / name
    destination.write_text(HEADER + ''.join(body) + '</svg>\n')
    print(f'{name}: {destination.stat().st_size:,} bytes')


def ink():
    rng = Random(22025)
    # Four unequal connected pools, not a radial spray. Round pooled edges and
    # folded current lines distinguish liquid ink from the other brushburst.
    pools = [
        ('M128 527 C44 469 71 291 180 237 C240 207 242 126 342 126 '
         'C430 108 487 166 553 205 C611 238 651 211 705 181 '
         'C789 128 883 173 886 260 C890 337 814 365 765 386 '
         'C702 419 689 489 755 536 C829 583 858 668 785 720 '
         'C720 765 649 717 600 682 C551 646 504 670 432 705 '
         'C342 769 196 729 183 637 C177 593 168 555 128 527 Z', 'ink-turquoise'),
        ('M836 274 C947 203 1091 228 1115 345 C1140 461 1035 569 1007 683 '
         'C994 738 990 799 925 815 C821 831 805 761 777 725 '
         'C720 647 768 597 813 564 C878 518 809 485 795 431 '
         'C778 364 774 324 836 274 Z', 'ink-violet'),
        ('M201 666 C228 642 265 652 294 688 C349 756 428 777 506 751 '
         'C571 729 629 742 641 781 C653 823 603 848 548 840 '
         'C466 828 415 871 332 831 C276 805 255 758 211 747 '
         'C174 738 168 696 201 666 Z', 'ink-blue'),
        ('M827 116 C843 73 901 65 938 91 C967 111 968 160 940 181 '
         'C904 210 882 172 857 178 C824 185 808 156 827 116 Z', 'ink-violet'),
    ]
    defs = ['<defs>\n',
        '<linearGradient id="ink-turquoise" x1="0" y1=".2" x2="1" y2=".8"><stop stop-color="#10b5be"/><stop offset=".38" stop-color="#087d9e"/><stop offset=".67" stop-color="#295bc3"/><stop offset="1" stop-color="#20cdbb"/></linearGradient>\n',
        '<linearGradient id="ink-violet" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#3a4bc1"/><stop offset=".35" stop-color="#9648ca"/><stop offset=".72" stop-color="#6342b8"/><stop offset="1" stop-color="#bf68d0"/></linearGradient>\n',
        '<linearGradient id="ink-blue" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#167baf"/><stop offset=".5" stop-color="#5358d7"/><stop offset="1" stop-color="#2cadc1"/></linearGradient>\n',
        '<clipPath id="ink-pools">\n']
    defs.extend(path(d, 'white') for d, _ in pools)
    defs.append('</clipPath>\n</defs>\n')
    printed = ['<!-- Original fluid ink: pooled colour, eddies and separate droplets. -->\n', *defs]
    alpha = []
    relief = [*defs, '<g clip-path="url(#ink-pools)">\n']
    for d, colour in pools:
        printed.append(path(d, f'url(#{colour})'))
        # A translucent darker meniscus is inside the pool silhouette.
        printed.append(path(d, 'none', stroke='#102b61', stroke_width='4', opacity='.34'))
        alpha.append(path(d, 'white'))
    printed.append('<g clip-path="url(#ink-pools)" fill="none" stroke-linecap="round">\n')
    # Broad curved folds of liquid pigment. Their centres never radiate from the
    # mathematical subject; each pool has its own off-centre current.
    flows = [
        ('M91 490 C26 368 183 273 266 248 C358 220 320 164 414 164 C518 163 510 287 669 243 C766 216 840 179 869 261', '#47dfd4', 19, .62),
        ('M101 472 C50 371 192 292 277 263 C383 228 339 183 420 182 C516 184 542 301 686 263 C792 235 816 214 861 270', '#b4f4df', 4, .62),
        ('M115 534 C248 540 178 441 257 369 C319 314 391 343 377 445 C362 561 221 519 239 639 C256 718 376 711 431 676 C510 624 548 658 612 687', '#134d91', 29, .64),
        ('M128 536 C247 528 202 433 275 380 C336 339 372 378 352 452 C328 532 218 531 256 635 C279 696 367 686 426 657', '#44e1ce', 6, .68),
        ('M260 600 C321 665 405 635 442 589 C495 525 535 607 594 618 C694 639 751 591 779 645', '#3be6c5', 15, .54),
        ('M870 284 C1029 207 1112 354 1012 443 C937 509 914 577 962 646 C1012 720 947 796 873 749', '#bc7cdd', 29, .57),
        ('M884 302 C1009 248 1069 352 995 420 C915 493 876 563 937 655 C981 720 928 769 887 741', '#434fbb', 22, .72),
        ('M897 312 C995 273 1036 351 981 406 C901 488 865 559 921 647', '#d3a9eb', 4, .62),
        ('M839 407 C840 478 934 451 911 384 C894 337 949 301 982 333', '#b95ed0', 12, .72),
        ('M836 681 C830 630 902 606 917 669 C928 712 884 716 880 686', '#37d5cf', 8, .52),
        ('M202 700 C292 709 300 820 401 812 C478 806 538 781 607 803', '#79d9dc', 6, .74),
    ]
    for d, colour, width, opacity in flows:
        printed.append(path(d, 'none', stroke=colour, stroke_width=width, opacity=opacity))
        relief.append(path(d, 'none', stroke='white', stroke_width=max(1.5, width*.2), opacity='.75'))
    # Tiny short striations sit along two curved shores, not across the orbit.
    for i in range(22):
        t = i / 21
        x, y = 142 + 162*t, 297 + 330*t
        d = f'M{x:.1f} {y:.1f} q{-18-7*sin(t*5):.1f} {12+7*t:.1f} {7+12*t:.1f} {29+10*t:.1f}'
        printed.append(path(d, 'none', stroke='#57d8cd', stroke_width='1.7', opacity='.4'))
        relief.append(path(d, 'none', stroke='white', stroke_width='1.7', opacity='.5'))
    printed.append('</g>\n')
    relief.append('</g>\n')
    # Controlled asymmetric droplet groups; the four large pools stay readable.
    for cx, cy, count in ((91, 268, 11), (1032, 730, 13), (265, 118, 8), (677, 802, 8)):
        for i in range(count):
            x, y = cx+rng.uniform(-42, 42), cy+rng.uniform(-38, 38)
            rx, ry = rng.uniform(1.7, 6.8), rng.uniform(2.1, 8.7)
            geo = f'cx="{x:.1f}" cy="{y:.1f}" rx="{rx:.1f}" ry="{ry:.1f}"'
            colour = ('#26bfb9', '#7d50c6', '#3a85c3', '#b66ac9')[i % 4]
            printed.append(f'<ellipse {geo} fill="{colour}"/>\n')
            alpha.append(f'<ellipse {geo} fill="white"/>\n')
    for name, body in [('print-sand-ink.svg', printed), ('mask-sand-ink.svg', alpha), ('relief-sand-ink.svg', relief)]:
        write(name, body)


def knife_polygon(start, end, width, seed):
    rng = Random(seed)
    dx, dy = end[0]-start[0], end[1]-start[1]
    length = hypot(dx, dy)
    ux, uy = dx/length, dy/length
    nx, ny = -uy, ux

    def at(t, across):
        return start[0]+dx*t+nx*across, start[1]+dy*t+ny*across

    # A broad palette-knife blade has almost straight sides and several unequal
    # sharp bristles at its flat end; no fan of strokes starts at a shared hub.
    left = [at(i/12, width*(.43+rng.uniform(-.06, .06))) for i in range(13)]
    tip = [at(1+rng.uniform(-.04, .05), width*a) for a in (.28, .13, -.02, -.17, -.3)]
    right = [at(i/12, -width*(.46+rng.uniform(-.06, .06))) for i in range(12, -1, -1)]
    tail = [at(rng.uniform(-.025, .025), width*a) for a in (-.28, -.08, .12, .3)]
    return polygon(left+tip+right+tail), at


def gold():
    rng = Random(25025)
    blades = [((91, 663), (1076, 281), 146, 'copper'),
              ((126, 180), (1037, 619), 104, 'gold'),
              ((275, 783), (785, 690), 65, 'bronze'),
              ((783, 94), (1025, 181), 57, 'gold')]
    shapes = [knife_polygon(start, end, width, 2510+i) for i, (start, end, width, _) in enumerate(blades)]
    defs = ['<defs>\n',
        '<linearGradient id="copper" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#682a38"/><stop offset=".25" stop-color="#b94d2e"/><stop offset=".6" stop-color="#ed9253"/><stop offset="1" stop-color="#b15236"/></linearGradient>\n',
        '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bf7927"/><stop offset=".34" stop-color="#edbc59"/><stop offset=".62" stop-color="#9b5229"/><stop offset="1" stop-color="#e6ac4b"/></linearGradient>\n',
        '<linearGradient id="bronze" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#a66132"/><stop offset=".5" stop-color="#e4a65d"/><stop offset="1" stop-color="#78383b"/></linearGradient>\n',
        '<clipPath id="knife-plate">\n']
    defs.extend(path(d, 'white') for d, _ in shapes)
    defs.append('</clipPath>\n<mask id="knife-dry" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="900"><rect width="1200" height="900" fill="white"/>\n')
    # Sparse long missing bristles expose the card through the dry paint. The
    # SAME cutouts are present in the coloured print and alpha silhouette.
    for i, ((_, _, width, _), (_, at)) in enumerate(zip(blades, shapes)):
        for k in range(6):
            t = rng.uniform(.48, .88)
            across = rng.uniform(-.35, .35)*width
            a, b = at(t, across), at(min(1.05, t+rng.uniform(.13, .27)), across+rng.uniform(-2, 2))
            d = f'M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}'
            defs.append(path(d, 'none', stroke='black', stroke_width=f'{rng.uniform(1.2, 4.2):.1f}'))
    defs.append('</mask>\n</defs>\n')
    printed = ['<!-- Original offset palette-knife strokes, dry bristles and detached angular chips. -->\n', *defs, '<g mask="url(#knife-dry)">\n']
    alpha = [*defs, '<g mask="url(#knife-dry)">\n']
    relief = [*defs, '<g mask="url(#knife-dry)" clip-path="url(#knife-plate)">\n']
    for i, ((_, _, width, colour), (d, at)) in enumerate(zip(blades, shapes)):
        printed.append(path(d, f'url(#{colour})'))
        alpha.append(path(d, 'white'))
        # Thick paint ridges are broken, parallel to each individual knife.
        for k in range(20):
            t = rng.uniform(.015, .65)
            end = min(.98, t+rng.uniform(.18, .58))
            offset = rng.uniform(-.39, .39)*width
            a, b, c = at(t, offset), at((t+end)*.5, offset+rng.uniform(-2, 2)), at(end, offset+rng.uniform(-2, 2))
            ridge = f'M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f} L{c[0]:.1f} {c[1]:.1f}'
            raised = k % 3 != 0
            printed.append(path(ridge, 'none', stroke=('#ffe1a0' if raised else '#613326'),
                                stroke_width=f'{rng.uniform(1.1, 3.8):.1f}', opacity=('.46' if raised else '.42')))
            if raised:
                relief.append(path(ridge, 'none', stroke='white', stroke_width=f'{rng.uniform(1.7, 3.3):.1f}', opacity='.9'))
        # A narrow raised edge along one flank catches a sharper raking glint.
        a, b = at(.025, width*.41), at(.97, width*.4)
        edge = f'M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}'
        printed.append(path(edge, 'none', stroke='#ffe4a5', stroke_width='3.2', opacity='.72'))
        relief.append(path(edge, 'none', stroke='white', stroke_width='4.5'))
    for body in (printed, alpha, relief):
        body.append('</g>\n')
    # Broad detached knife chips, not confetti dots or another radial spray.
    for cx, cy, count in ((115, 600, 8), (1080, 269, 10), (182, 159, 7), (951, 669, 8), (285, 808, 5)):
        for k in range(count):
            x, y = cx+rng.uniform(-37, 37), cy+rng.uniform(-29, 29)
            size = rng.uniform(3, 13)
            angle = rng.uniform(-.6, .7)
            vx, vy = cos(angle)*size, sin(angle)*size
            d = polygon([(x-vx, y-vy), (x+vx*.7, y+vy*.7-3), (x+vx, y+vy), (x-vx*.6, y-vy*.6+size*.36)])
            printed.append(path(d, ('#d8984c', '#a64e30', '#f0c36a', '#b16c42')[k % 4]))
            alpha.append(path(d, 'white'))
            if k % 3 == 0:
                relief.append(path(d, 'white', opacity='.75'))
    for name, body in [('print-golden-brush.svg', printed), ('mask-golden-brush.svg', alpha), ('relief-golden-brush.svg', relief)]:
        write(name, body)


if __name__ == '__main__':
    ink()
    gold()
