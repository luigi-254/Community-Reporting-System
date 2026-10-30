#!/usr/bin/env python3
"""
Generate MTAA Fix brand + favicon assets from the supplied master logo image.

Source of truth : assets/brand/mtaa-fix-logo.png  (pristine copy of the supplied file)
Output          : <app>/public/brand/*  and  <app>/app/{favicon.ico,icon.png,apple-icon.png,manifest.webmanifest}

The supplied master is a flat-colour raster on an opaque white background.
We recover a clean alpha channel by un-premultiplying against white using the
three measured artwork colours, so anti-aliased edges keep their exact shape
and the background becomes fully transparent (no coloured plate, no halo).
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
MASTER = REPO / "assets" / "brand" / "mtaa-fix-logo.png"

APPS = ["citizen-frontend", "government-frontend", "admin-dashboard"]

# Measured dominant (interior) colours of the supplied artwork.
CORES = {
    "green": (29, 192, 90),    # #1DC05A
    "blue": (45, 122, 247),    # #2D7AF7
    "orange": (251, 121, 27),  # #FB791B
}

ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64)]
# The supplied PNG is a lossy-upscaled raster, so the "white" background is
# really 252-255 with speckle noise. Anything below this alpha level is that
# noise rather than artwork, and is discarded so the background is truly empty.
ALPHA_FLOOR = 10  # alpha < 10/255


def _candidates(pixel):
    """Return (sse, core_name, alpha) for the best-matching flat colour."""
    best = None
    for name, core in CORES.items():
        denom = sum((255 - core[k]) ** 2 for k in range(3))
        numer = sum((255 - core[k]) * (255 - pixel[k]) for k in range(3))
        alpha = min(1.0, max(0.0, numer / denom))
        recon = [alpha * core[k] + (1 - alpha) * 255 for k in range(3)]
        sse = sum((recon[k] - pixel[k]) ** 2 for k in range(3))
        if best is None or sse < best[0]:
            best = (sse, name, alpha)
    return best


def extract_alpha(src: Image.Image) -> Image.Image:
    """Rebuild the artwork as RGBA with a genuinely transparent background."""
    rgb = src.convert("RGB")
    width, height = rgb.size
    src_px = rgb.load()
    out = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    dst_px = out.load()

    for y in range(height):
        for x in range(width):
            pixel = src_px[x, y]
            _, name, alpha = _candidates(pixel)
            level = int(round(alpha * 255))
            if level < ALPHA_FLOOR:
                continue
            dst_px[x, y] = (*CORES[name], level)

    # Fully transparent pixels must carry zero RGB too, so that no faint halo
    # can survive resampling or browser compositing.
    px = out.load()
    for y in range(height):
        for x in range(width):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)

    return out


def trim(img: Image.Image, pad: int = 0) -> Image.Image:
    # Use the alpha band explicitly: Image.getbbox() on RGBA also considers the
    # RGB bands, which would keep transparent-but-coloured pixels in the frame.
    bbox = img.getchannel("A").getbbox()
    if bbox is None:
        return img
    cropped = img.crop(bbox)
    if pad:
        canvas = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
        canvas.paste(cropped, (pad, pad), cropped)
        return canvas
    return cropped


def square(img: Image.Image, size: int, fill: float = 0.96) -> Image.Image:
    """Aspect-preserving square canvas: artwork scaled to `fill` of the width."""
    scale = (size * fill) / img.width
    resized = img.resize(
        (max(1, int(round(img.width * scale))), max(1, int(round(img.height * scale)))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2), resized)
    return canvas


def write_ico(art: Image.Image, path: Path) -> None:
    """Write a multi-resolution ICO whose frames are 32-bit BGRA with real alpha."""
    frames = [square(art, s, fill=1.0) for s, _ in ICO_SIZES]
    # Pillow only emits frames no larger than the base image, so the largest
    # resolution must be the base and the rest are appended to it.
    frames.reverse()
    frames[0].save(
        path,
        format="ICO",
        sizes=ICO_SIZES,
        append_images=frames[1:],
        bitmap_format="bmp",
    )


def main() -> int:
    if not MASTER.exists():
        print(f"ERROR: master logo not found: {MASTER}", file=sys.stderr)
        return 1

    art_full = extract_alpha(Image.open(MASTER))
    art = trim(art_full, pad=4)

    for app in APPS:
        app_dir = REPO / app
        public_brand = app_dir / "public" / "brand"
        app_dir_icons = app_dir / "app"
        public_brand.mkdir(parents=True, exist_ok=True)

        # Full-resolution transparent logo used across the UI.
        art.save(public_brand / "mtaa-fix-logo.png", format="PNG", optimize=True)

        # Square transparent PNGs (manifest / PWA + standalone favicon use).
        square(art, 192, fill=1.0).save(public_brand / "mtaa-fix-logo-192.png", format="PNG", optimize=True)
        square(art, 512, fill=1.0).save(public_brand / "mtaa-fix-logo-512.png", format="PNG", optimize=True)

        # Next.js App Router file conventions -> automatic <head> metadata.
        write_ico(art, app_dir_icons / "favicon.ico")
        square(art, 32, fill=1.0).save(app_dir_icons / "icon.png", format="PNG", optimize=True)
        square(art, 180, fill=1.0).save(app_dir_icons / "apple-icon.png", format="PNG", optimize=True)

        manifest = {
            "name": "MTAA Fix",
            "short_name": "MTAA Fix",
            "description": "Report community problems, track progress, and connect local authorities.",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#ffffff",
            "theme_color": "#187a58",
            "icons": [
                {
                    "src": "/brand/mtaa-fix-logo-192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any",
                },
                {
                    "src": "/brand/mtaa-fix-logo-512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any",
                },
            ],
        }
        (app_dir_icons / "manifest.webmanifest").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )

        print(f"generated assets for {app}")

    print(f"transparent master artwork: {art.width}x{art.height}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
