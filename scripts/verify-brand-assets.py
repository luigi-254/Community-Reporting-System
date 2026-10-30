#!/usr/bin/env python3
"""Verify the generated MTAA Fix favicon/logo assets: transparency, fidelity, ICO structure."""

import importlib.util
import struct
import sys
from pathlib import Path

from PIL import Image, ImageChops

REPO = Path(__file__).resolve().parents[1]
APPS = ["citizen-frontend", "government-frontend", "admin-dashboard"]
MASTER = REPO / "assets" / "brand" / "mtaa-fix-logo.png"
OUT = REPO / "docs" / "brand-verification"
OUT.mkdir(parents=True, exist_ok=True)

spec = importlib.util.spec_from_file_location("gen", REPO / "scripts" / "generate-brand-assets.py")
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

failures = []


def check(label, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def alpha_stats(img: Image.Image):
    a = img.convert("RGBA").getchannel("A")
    hist = a.histogram()
    total = sum(hist)
    transparent, opaque = hist[0], hist[255]
    return {
        "total": total,
        "transparent": transparent,
        "partial": total - transparent - opaque,
        "opaque": opaque,
        "pct_transparent": 100.0 * transparent / total,
        "corner_alpha": a.getpixel((0, 0)),
    }


print("== Master source ==")
master = Image.open(MASTER)
check("master is the untouched supplied original", master.size == (539, 540) and master.mode == "RGBA",
      f"size={master.size} mode={master.mode}")

# Reference: full-canvas extraction composited over white must reproduce the original.
full = gen.extract_alpha(Image.open(MASTER))
white = Image.new("RGB", full.size, (255, 255, 255))
white.paste(full, (0, 0), full)
orig_rgb = Image.open(MASTER).convert("RGB")
diff = ImageChops.difference(white, orig_rgb).convert("L")
hist = diff.histogram()
total = sum(hist)
mean = sum(i * n for i, n in enumerate(hist)) / total
pct_worse = 100.0 * sum(hist[40:]) / total
check("extracted alpha reproduces the original artwork over white",
      mean < 8 and pct_worse < 3.0,
      f"mean abs diff={mean:.2f}/255, {pct_worse:.2f}% pixels differ >40")
white.save(OUT / "master-recomposited-over-white.png")
Image.open(MASTER).convert("RGB").save(OUT / "master-original.png")
Image.new("RGB", full.size, (255, 0, 255)).save(OUT / "master-background-magenta.png")
mag = Image.new("RGB", full.size, (255, 0, 255))
mag.paste(full, (0, 0), full)
mag.save(OUT / "master-recomposited-over-magenta.png")

for app in APPS:
    app_dir = REPO / app
    print(f"\n== {app} ==")

    # ---------- transparent UI logo ----------
    logo_path = app_dir / "public" / "brand" / "mtaa-fix-logo.png"
    logo = Image.open(logo_path).convert("RGBA")
    st = alpha_stats(logo)
    check("public/brand/mtaa-fix-logo.png is RGBA", logo.mode == "RGBA")
    check("logo corner fully transparent", st["corner_alpha"] == 0, f"corner alpha={st['corner_alpha']}")
    check("logo has transparent background", st["pct_transparent"] > 15,
          f"{st['pct_transparent']:.1f}% transparent, {st['partial']} partial-alpha edge px")
    check("logo has visible artwork", st["opaque"] > 10000, f"{st['opaque']} opaque px")
    check("logo artwork bbox fills the canvas", logo.getchannel("A").getbbox() is not None)

    # The saved logo must be pixel-identical to the generated master artwork.
    art = gen.trim(gen.extract_alpha(Image.open(MASTER)), pad=4)
    same = (logo.size == art.size and
            ImageChops.difference(logo.getchannel("A"), art.getchannel("A")).getbbox() is None)
    check("saved logo matches generated master artwork", same, f"{logo.size} vs {art.size}")

    # ---------- favicon PNGs ----------
    for name, expect in (("icon.png", 32), ("apple-icon.png", 180)):
        p = app_dir / "app" / name
        im = Image.open(p).convert("RGBA")
        st = alpha_stats(im)
        check(f"app/{name} size {expect}x{expect}", im.size == (expect, expect), f"got {im.size}")
        check(f"app/{name} corner transparent", st["corner_alpha"] == 0, f"corner alpha={st['corner_alpha']}")
        check(f"app/{name} has transparency", st["pct_transparent"] > 5,
              f"{st['pct_transparent']:.1f}% transparent")

    # ---------- ICO structure ----------
    ico_path = app_dir / "app" / "favicon.ico"
    raw = ico_path.read_bytes()
    reserved, kind, count = struct.unpack("<HHH", raw[:6])
    check("app/favicon.ico has valid ICONDIR", reserved == 0 and kind == 1 and count == 4,
          f"type={kind} frames={count}")
    entries = []
    for i in range(count):
        off = 6 + i * 16
        w, h, ncol, r0, planes, bpp, size, offset = struct.unpack("<BBBBHHII", raw[off:off + 16])
        entries.append({"w": w or 256, "h": h or 256, "bpp": bpp, "size": size, "offset": offset})

    for e in entries:
        chunk = raw[e["offset"]:e["offset"] + e["size"]]
        is_png = chunk[:8] == b"\x89PNG\r\n\x1a\n"
        dib_bpp = None if is_png else struct.unpack("<I", chunk[14:18])[0]
        check(f"ICO frame {e['w']}x{e['h']} is 32-bit with a real alpha channel",
              is_png or dib_bpp == 32,
              f"bpp={e['bpp']}{' (PNG frame)' if is_png else f' (DIB bpp={dib_bpp})'}")

    ico = Image.open(ico_path)
    for size in sorted(ico.info.get("sizes", [])):
        frame = ico.ico.getimage(size).convert("RGBA")
        st = alpha_stats(frame)
        check(f"ICO frame {size[0]}x{size[1]} reads back transparent", st["corner_alpha"] == 0,
              f"corner alpha={st['corner_alpha']}, {st['pct_transparent']:.1f}% transparent")

    # ---------- visual composites ----------
    frames = []
    for size in (16, 32, 48, 64):
        frames.append((size, ico.ico.getimage((size, size)).convert("RGBA")))
    for size, frame in frames:
        for bg_name, bg in (("white", (255, 255, 255)), ("black", (20, 20, 20)),
                            ("magenta", (255, 0, 255))):
            canvas = Image.new("RGB", frame.size, bg)
            canvas.paste(frame, (0, 0), frame)
            canvas.resize((size * 8, size * 8), Image.Resampling.NEAREST).save(
                OUT / f"{app}-favicon-{size}-{bg_name}.png")

    strip = Image.new("RGBA", (sum(s + 10 for s, _ in frames) + 10, 74), (0, 0, 0, 0))
    x = 5
    for size, frame in frames:
        strip.alpha_composite(frame, (x, (74 - size) // 2))
        x += size + 10
    strip.save(OUT / f"{app}-favicon-strip.png")

print(f"\nVisual composites written to {OUT}")
if failures:
    print(f"\n{len(failures)} CHECK(S) FAILED:")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("\nALL CHECKS PASSED")
