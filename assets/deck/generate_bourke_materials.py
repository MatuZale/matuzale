"""Six original foil plates for the Bourke escape-time cards.

This generates physical-looking monochrome relief and separate polished-crest
alpha, not fractal artwork. CSS moves light over these fixed structures. No
third-party textures, art, or shader code is used. Run from any directory with
Python, NumPy and Pillow; only bourke-material-* and bourke-etch-* are written.
"""
from pathlib import Path
import argparse
import math

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent / 'foil'
W, H, S = 640, 896, 2
TAU = math.tau
yy, xx = np.mgrid[0:H*S, 0:W*S].astype(np.float32)
x = (xx+.5)/(W*S)*2-1
y = ((yy+.5)/(H*S)*2-1)*1.4


def ridge(phase, power=10):
    return np.maximum(np.cos(phase*TAU), 0)**power


def silk():
    # Closely combed arcs, bent like a fine folded moiré silk ribbon.
    phase = 40*y + 3.8*np.sin(2.5*x-1.2*y) + 1.1*np.sin(7*x+3*y)
    folded = .5+.5*np.sin(phase*TAU)
    crest = ridge(phase, 12)
    material = 28 + 112*folded + 64*crest
    return material, crest*.82


def hammered_gold():
    # Irregular rounded hammer cups: no straight cell borders or woven grid.
    first = np.full(x.shape,np.inf,dtype=np.float32)
    for row in range(-1,14):
        for col in range(-1,11):
            n = row*13+col
            sx = -1+col*.23+.075*math.sin(n*2.31)
            sy = -1.4+row*.23+.075*math.cos(n*1.87)
            distance = ((x-sx)*(.9+.12*math.sin(n)))**2+((y-sy)*(1+.13*math.cos(n)))**2
            first = np.minimum(first,distance)
    radius = np.sqrt(first)
    cup = .5+.5*np.cos(np.minimum(radius/.2, 1)*math.pi)
    grain = ridge(65*x+6*np.sin(3*y)+3*cup, 15)
    material = 26+142*cup+22*grain
    crest = np.exp(-((radius-.105)/.007)**2)*.47+grain*.13
    # Small, stamped four-point stars are part of this plate, not animated sprites.
    stars = Image.new('L', (W*S,H*S))
    d = ImageDraw.Draw(stars)
    for k in range(31):
        cx = (35+(k*179)%570)*S
        cy = (42+(k*263)%810)*S
        size = (3+(k%4))*S
        p = [(cx,cy-size),(cx+size*.24,cy-size*.24),(cx+size,cy),
             (cx+size*.24,cy+size*.24),(cx,cy+size),(cx-size*.24,cy+size*.24),
             (cx-size,cy),(cx-size*.24,cy-size*.24)]
        d.polygon(p,fill=225)
    star = np.asarray(stars,dtype=np.float32)/255
    return np.maximum(material, 190*star), np.maximum(crest,star)


def opal_mosaic():
    # Irregular translucent panes, each with its own fine nacre growth direction.
    first = np.full(x.shape,np.inf,dtype=np.float32)
    second = first.copy()
    identity = np.zeros(x.shape,dtype=np.int16)
    for row in range(-1,9):
        for col in range(-1,7):
            n = (row+1)*8+col+1
            sx = -.95+col*.39+.09*math.sin(n*2.73)
            sy = -1.28+row*.39+.08*math.cos(n*1.89)
            distance = (x-sx)**2+(y-sy)**2
            nearer = distance < first
            second = np.where(nearer,first,np.minimum(second,distance))
            first = np.minimum(first,distance)
            identity = np.where(nearer,n,identity)
    orientation = np.sin(identity*2.4)*math.pi
    phase = 26*(x*np.cos(orientation)+y*np.sin(orientation))+.7*np.sin(4*y)
    seam = np.exp(-((np.sqrt(second)-np.sqrt(first))/.008)**2)
    crest = np.maximum(ridge(phase,14)*.6,seam*.48)
    material = 53+35*np.sin(identity*3.1)+65*ridge(phase,4)+26*seam
    return material,crest


def crystal_prism():
    # A triangular cut-glass field: alternate halves have opposite micro-cuts.
    u = (x+y*.57735)*8
    v = y*9.2376
    a,b = np.mod(u,1),np.mod(v,1)
    upper = a+b > 1
    plane = np.where(upper,(1-a)*.7+(1-b)*.3,a*.3+b*.7)
    identity = np.floor(u)*3+np.floor(v)*7+upper*11
    phase = np.where(upper,47*x+25*y,47*x-25*y)
    edge = np.minimum(np.minimum(a,1-a),np.minimum(b,1-b))
    edge = np.minimum(edge,np.abs(a+b-1)*.707)
    bevel = np.exp(-(edge/.027)**2)
    crest = np.maximum(bevel*.9,ridge(phase,16)*.38)
    material = 30+115*plane+23*np.sin(identity*2.1)+39*bevel+22*ridge(phase,7)
    return material,crest


def guilloche():
    # Threefold banknote-style intaglio, with two interfering fine-line families.
    r = np.hypot(x,y*.86)
    theta = np.arctan2(y*.86,x)
    a = 31*r+1.8*np.sin(3*theta-r*2.3)*np.minimum(r*3,1)
    b = 27*r-1.7*np.sin(3*theta+r*2.7)*np.minimum(r*3,1)
    crest = np.maximum(ridge(a,14),ridge(b,16)*.68)
    material = 22+84*(.5+.5*np.sin(a*TAU))+87*crest
    return material,crest*.9


def cosmos():
    # Sparse embossed disks, broken rings and pointed stars. The empty space
    # between them is intentional; broad fog would wash out the fractal.
    plate = Image.new('L',(W*S,H*S),16)
    polished = Image.new('L',(W*S,H*S),0)
    d,e = ImageDraw.Draw(plate),ImageDraw.Draw(polished)
    rng = np.random.default_rng(41031)
    for k in range(92):
        cx,cy = rng.uniform(5,W-5)*S,rng.uniform(5,H-5)*S
        radius = rng.uniform(1.8,8.5)*S
        box = (cx-radius,cy-radius,cx+radius,cy+radius)
        if k%4:
            d.ellipse(box,fill=int(rng.uniform(60,145)))
            e.arc(box,start=20+(k*31)%180,end=215+(k*31)%130,fill=250,width=max(1,round(S*1.5)))
            d.ellipse((cx-radius*.48,cy-radius*.48,cx+radius*.48,cy+radius*.48),fill=36)
            e.ellipse((cx-radius*.4,cy-radius*.4,cx+radius*.4,cy+radius*.4),fill=180)
        else:
            points=[]
            for i in range(8):
                a = -math.pi/2+i*math.pi/4
                r = radius if i%2==0 else radius*.23
                points.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
            d.polygon(points,fill=185)
            e.polygon(points,fill=245)
    for k in range(400):
        cx,cy = rng.uniform(0,W)*S,rng.uniform(0,H)*S
        r = rng.uniform(.3,.8)*S
        e.ellipse((cx-r,cy-r,cx+r,cy+r),fill=int(rng.uniform(60,170)))
    return np.asarray(plate,dtype=np.float32),np.asarray(polished,dtype=np.float32)/255


DESIGNS = {'thorn-rose':silk,'thorn-crown':hammered_gold,'thorn-tide':opal_mosaic,
           'reuleaux':crystal_prism,'reuleaux-lace':guilloche,'reuleaux-nebula':cosmos}

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--only', choices=DESIGNS)
args = parser.parse_args()

for name,draw in DESIGNS.items():
    if args.only and args.only != name:
        continue
    material,crest = draw()
    mat = Image.fromarray(np.uint8(np.clip(material,0,255))).resize((W,H),Image.Resampling.LANCZOS).convert('RGB')
    alpha = Image.fromarray(np.uint8(np.clip(crest*255,0,255))).resize((W,H),Image.Resampling.LANCZOS)
    etched = Image.new('RGBA',(W,H),'white')
    etched.putalpha(alpha)
    material_path,etch_path = ROOT/f'bourke-material-{name}.webp',ROOT/f'bourke-etch-{name}.webp'
    mat.save(material_path,'WEBP',quality=78,method=6)
    etched.save(etch_path,'WEBP',lossless=True,exact=True,method=6)
    print(name,material_path.stat().st_size,etch_path.stat().st_size,flush=True)
