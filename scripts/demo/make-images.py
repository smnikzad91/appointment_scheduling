"""Generates the placeholder artwork used by the demo data (scripts/demo/seed.mjs).

Abstract gradients only — no text, no stock photos — written to apps/web/public/uploads/demo/.
Deterministic (seeded), so re-running produces the same files.
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "web", "public", "uploads", "demo")
os.makedirs(OUT, exist_ok=True)
PALETTES = [  # warm salon tones, one per salon
    ["#a34a30", "#e5b6a8", "#f8ebe7", "#6a301f"],
    ["#7b4b94", "#d9b8e6", "#f5ecf9", "#3f2350"],
    ["#2f6f68", "#a8d5cf", "#e9f5f3", "#173936"],
    ["#b0715a", "#f0cdb8", "#fbf1ea", "#5e3527"],
    ["#9c3d5a", "#eab3c4", "#fbeef2", "#4e1c2c"],
]
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def gradient(w, h, a, b, angle):
    img = Image.new("RGB", (w, h)); px = img.load(); a, b = hexrgb(a), hexrgb(b)
    ca, sa = math.cos(angle), math.sin(angle); span = abs(w * ca) + abs(h * sa)
    for y in range(h):
        for x in range(w):
            t = min(1, max(0, ((x - w / 2) * ca + (y - h / 2) * sa) / span + 0.5))
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return img

def blobs(img, colors, rnd, n, rmin, rmax, blur):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    for _ in range(n):
        r = rnd.randint(rmin, rmax); x, y = rnd.randint(0, img.width), rnd.randint(0, img.height)
        d.ellipse((x - r, y - r, x + r, y + r), fill=hexrgb(rnd.choice(colors)) + (rnd.randint(70, 150),))
    return Image.alpha_composite(img.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(blur))).convert("RGB")

def strands(img, colors, rnd, n):  # flowing curves, loosely "hair"
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer); w, h = img.size
    for _ in range(n):
        c = hexrgb(rnd.choice(colors)) + (rnd.randint(90, 190),); x0 = rnd.uniform(0, w); amp = rnd.uniform(20, 70); ph = rnd.uniform(0, 6)
        pts = [(x0 + amp * math.sin(ph + t / h * 5) + t * rnd.uniform(-.05, .05), t) for t in range(0, h + 10, 8)]
        d.line(pts, fill=c, width=rnd.randint(3, 9), joint="curve")
    return Image.alpha_composite(img.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(1.2))).convert("RGB")

def person(img, color):  # simple head-and-shoulders silhouette for avatars
    d = ImageDraw.Draw(img); w, h = img.size; c = hexrgb(color)
    d.ellipse((w * .33, h * .2, w * .67, h * .54), fill=c)
    d.ellipse((w * .15, h * .6, w * .85, h * 1.3), fill=c)
    return img

def save(img, name):
    img.save(os.path.join(OUT, name), "JPEG", quality=84, optimize=True)

for s, pal in enumerate(PALETTES):
    rnd = random.Random(s)
    save(blobs(gradient(1200, 500, pal[1], pal[0], rnd.uniform(0, 3)), pal, rnd, 14, 60, 220, 40), f"salon{s}-cover.jpg")
    save(blobs(gradient(400, 400, pal[0], pal[3], .8), pal[1:3], rnd, 5, 40, 120, 18), f"salon{s}-logo.jpg")
    for k in range(3):
        base = gradient(400, 400, pal[2], pal[1], rnd.uniform(0, 3))
        save(person(blobs(base, pal[1:3], rnd, 4, 40, 110, 20), pal[(k % 2) * 3]), f"salon{s}-stylist{k}-avatar.jpg")
        save(blobs(gradient(1200, 500, pal[3], pal[0], rnd.uniform(0, 3)), pal[1:], rnd, 10, 50, 180, 35), f"salon{s}-stylist{k}-cover.jpg")
    for g in range(6):
        base = gradient(800, 800, rnd.choice(pal[1:3]), rnd.choice([pal[0], pal[3]]), rnd.uniform(0, 3))
        save(strands(blobs(base, pal, rnd, 6, 60, 200, 30), pal, rnd, 26), f"salon{s}-gallery{g}.jpg")
rnd = random.Random(99)
save(blobs(gradient(1200, 400, "#f1d7d0", "#a34a30", .3), ["#fcf5f3", "#c86346", "#532618"], rnd, 16, 40, 170, 30), "banner.jpg")
print(len(os.listdir(OUT)), "images in", os.path.normpath(OUT))
