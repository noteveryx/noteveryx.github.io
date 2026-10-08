"""Round the corners of assets/favicon.jpg and save as assets/favicon.png.

- Reads favicon.jpg
- Creates a rounded-rectangle alpha mask (radius = 18% of side)
- Applies the mask so corners are fully transparent
- Saves as favicon.png (PNG supports alpha, JPG does not)
"""
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path(r"C:\Users\42692\WorkBuddy\Claw\knowledge-base\assets\favicon.jpg")
DST = Path(r"C:\Users\42692\WorkBuddy\Claw\knowledge-base\assets\favicon.png")

img = Image.open(SRC).convert("RGBA")
# 缩到 256×256, favicon 标签页够用
img = img.resize((256, 256), Image.LANCZOS)
w, h = img.size
radius = int(min(w, h) * 0.18)

mask = Image.new("L", (w, h), 0)
draw = ImageDraw.Draw(mask)
# Pillow>=8.2 supports rounded_rectangle; fall back to pieslice for older versions
try:
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
except AttributeError:
    draw.rectangle((0, 0, w, h), fill=0)
    for cx, cy in [(radius, radius), (w - radius, radius), (radius, h - radius), (w - radius, h - radius)]:
        draw.pieslice((cx - radius, cy - radius, cx + radius, cy + radius), 180, 270, fill=255)
        draw.pieslice((cx - radius, cy - radius, cx + radius, cy + radius), 0, 90, fill=255)
    draw.rectangle((radius, 0, w - radius, h), fill=255)
    draw.rectangle((0, radius, w, h - radius), fill=255)

img.putalpha(mask)
img.save(DST, format="PNG", optimize=True)
print(f"size: {DST.stat().st_size} bytes  ({w}x{h}, radius={radius})")
