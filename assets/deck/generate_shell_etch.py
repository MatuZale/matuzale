"""Original fivefold shell engraving for Sand Dollar's selective holographic foil.

Fixed nested contours, not particles. Run with Python's standard library only.
The splash's existing alpha clips this plate; no artwork is regenerated.
"""
from pathlib import Path
import math

parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 524" preserveAspectRatio="none">',
         '<g fill="none" stroke="white" stroke-linejoin="round">']
for k in range(1, 94):
    radius = 7 + k * 5.9
    points = []
    for step in range(121):
        theta = step * math.tau / 120
        ripple = (7 + radius * .055) * math.sin(theta * 5 + radius * .007)
        r = radius + ripple
        points.append((400 + r * math.cos(theta), 264 + r * .78 * math.sin(theta)))
    path = 'M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in points) + 'Z'
    parts.append(f'<path d="{path}" stroke-width="{1.2 if k % 4 else 2.1}" opacity="{.8 if k % 4 else 1}"/>')
parts.extend(['</g>', '</svg>'])
target = Path(__file__).resolve().parent / 'foil' / 'etch-sand-shell.svg'
target.write_text('\n'.join(parts) + '\n')
print(target.name, target.stat().st_size)
