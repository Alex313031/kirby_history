#!/usr/bin/env python3
"""Temporary helper: generate serving thumbnails for the model table.

Reads  imgs/models/original/*.jpg  (untouched masters)
Writes imgs/models/<same-basename>.jpg  — 192px tall (2x the 96px CSS
display size, so they stay crisp on hi-DPI screens), quality 88,
optimized progressive JPEG.

Safe to re-run (overwrites the thumbs). Delete this script when done.

Usage: python3 make_thumbs.py
"""

import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "imgs", "models", "original")
DST = os.path.join(HERE, "imgs", "models")
THUMB_HEIGHT = 192  # px; table displays at 96px CSS

total_in = total_out = 0
count = 0

for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith((".jpg", ".jpeg")):
        continue
    src_path = os.path.join(SRC, name)
    dst_path = os.path.join(DST, name)

    with Image.open(src_path) as im:
        w, h = im.size
        if h > THUMB_HEIGHT:
            im = im.resize((round(w * THUMB_HEIGHT / h), THUMB_HEIGHT),
                           Image.LANCZOS)
        im.save(dst_path, format="JPEG", quality=88, optimize=True,
                progressive=True)

    total_in += os.path.getsize(src_path)
    total_out += os.path.getsize(dst_path)
    count += 1

print(f"{count} thumbnails written to imgs/models/")
print(f"originals: {total_in/1024/1024:.1f} MB  ->  served thumbs: "
      f"{total_out/1024:.0f} KB")
