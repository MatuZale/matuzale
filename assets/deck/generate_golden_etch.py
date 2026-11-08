"""Fine foil cuts registered to Golden's existing orange palette-knife print.

Writes one new SVG only; the accepted print and its paint silhouette stay intact.
Uses the original blade geometry and dry-bristle mask, with no external assets.
"""
from math import sin
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True
from generate_paint_finishes import knife_polygon


ROOT = Path(__file__).resolve().parent / "foil"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
source = ET.parse(ROOT / "mask-golden-brush.svg").getroot()
root = ET.Element(f"{{{NS}}}svg", {"viewBox": "0 0 1200 900", "preserveAspectRatio": "none"})
defs = source.find(f"{{{NS}}}defs")
root.append(defs)
blades = [((91, 663), (1076, 281), 146), ((126, 180), (1037, 619), 104),
          ((275, 783), (785, 690), 65), ((783, 94), (1025, 181), 57)]
plate = ET.SubElement(root, f"{{{NS}}}g", {"mask": "url(#knife-dry)", "fill": "none", "stroke": "white", "stroke-linecap": "round"})
for index, (start, end, width) in enumerate(blades):
    silhouette, at = knife_polygon(start, end, width, 2510 + index)
    clip = ET.SubElement(defs, f"{{{NS}}}clipPath", {"id": f"blade-{index}"})
    ET.SubElement(clip, f"{{{NS}}}path", {"d": silhouette})
    group = ET.SubElement(plate, f"{{{NS}}}g", {"clip-path": f"url(#blade-{index})"})
    count = round(width / 4)
    for cut in range(count):
        across = (cut / (count-1) - .5) * width
        points = []
        for step in range(25):
            t = step / 24
            x, y = at(t, across + sin(t * 12 + cut*.21) * 1.4)
            points.append(f"{x:.2f} {y:.2f}")
        ET.SubElement(group, f"{{{NS}}}path", {
            "d": "M" + "L".join(points), "stroke-width": "1.25" if cut % 4 else "2.1",
            "opacity": ".65" if cut % 4 else ".95"})
    # Short diagonal cuts give the foil tooth between the long raised bristles.
    for cut in range(18):
        t = .04 + cut * .052
        across = sin(cut*2.7) * width*.29
        a, b = at(t, across-5), at(t+.019, across+5)
        ET.SubElement(group, f"{{{NS}}}path", {
            "d": f"M{a[0]:.2f} {a[1]:.2f}L{b[0]:.2f} {b[1]:.2f}",
            "stroke-width": "1.15", "opacity": ".75"})

ET.indent(root)
destination = ROOT / "etch-golden-brush.svg"
ET.ElementTree(root).write(destination, encoding="unicode")
print(destination.name, destination.stat().st_size)
