#!/usr/bin/env python3
"""Draw public/about/architecture.png so its rings use organization.js radii."""

import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "data" / "organization.js"
OUTPUT = ROOT / "public" / "about" / "architecture.png"
SIZE = 2048


def read_rings():
    text = SOURCE.read_text(encoding="utf-8")
    found = re.findall(
        r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*radius:\s*([0-9.]+)\s*\}",
        text,
    )
    if not found:
        raise SystemExit("未在 organization.js 中解析到圆圈半径")
    return [(ring_id, name, float(radius)) for ring_id, name, radius in found]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def radial_background(size):
    inner = (14, 32, 58)
    outer = (5, 8, 14)
    sample = 640
    image = Image.new("RGB", (sample, sample))
    pixels = image.load()
    for y in range(sample):
        for x in range(sample):
            distance = math.hypot(x - sample / 2, y - sample / 2) / (sample / 2)
            t = min(1.0, distance) ** 0.9
            pixels[x, y] = lerp(inner, outer, t)
    return image.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")


def stamp_ring(base, radius, color, widths):
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx = cy = base.size[0] / 2
    for width, alpha in widths:
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            outline=(*color, alpha),
            width=width,
        )
    return Image.alpha_composite(base, overlay)


def stamp_disc(base, radius, color):
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx = cy = base.size[0] / 2
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color)
    blurred = overlay.filter(ImageFilter.GaussianBlur(18))
    return Image.alpha_composite(base, blurred)


def main():
    rings = read_rings()
    image = radial_background(SIZE)
    half = SIZE / 2
    draw_rings = [radius for _ring_id, _name, radius in rings if radius > 0]
    zones = [0.90, 0.61, 0.35, 0.105]
    zone_colors = [
        (120, 164, 196, 18),
        (150, 196, 220, 20),
        (186, 214, 230, 22),
        (232, 206, 150, 46),
    ]
    for ratio, color in zip(zones, zone_colors):
        image = stamp_disc(image, ratio * half, color)

    for ratio in draw_rings:
        radius = ratio * half
        image = stamp_ring(
            image,
            radius,
            (136, 196, 226),
            [(34, 28), (10, 70), (3, 210)],
        )
        image = stamp_ring(image, radius, (226, 196, 132), [(2, 160)])

    image = stamp_ring(image, 0.085 * half, (240, 214, 156), [(8, 80), (3, 230)])

    tick = Image.new("RGBA", image.size, (0, 0, 0, 0))
    tick_draw = ImageDraw.Draw(tick)
    cx = cy = half
    outer = 0.74 * half
    for step in range(72):
        angle = math.tau * step / 72
        inner = outer + (10 if step % 6 else 22)
        tick_draw.line(
            [
                (cx + math.cos(angle) * outer, cy + math.sin(angle) * outer),
                (cx + math.cos(angle) * inner, cy + math.sin(angle) * inner),
            ],
            fill=(186, 214, 230, 90 if step % 6 == 0 else 40),
            width=2,
        )
    image = Image.alpha_composite(image, tick)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(OUTPUT, "PNG", optimize=True)
    verify(OUTPUT, draw_rings)
    print(f"wrote {OUTPUT}")


def verify(path, radii):
    image = Image.open(path).convert("RGB")
    width, height = image.size
    assert width == height

    def luminance(ratio):
        samples = []
        for offset in (-0.008, -0.004, 0, 0.004, 0.008):
            radius = (ratio + offset) * width / 2
            band = []
            for index in range(24):
                angle = math.tau * index / 24
                x = int(width / 2 + math.cos(angle) * radius)
                y = int(height / 2 + math.sin(angle) * radius)
                x = min(width - 1, max(0, x))
                y = min(height - 1, max(0, y))
                pixel = image.getpixel((x, y))
                band.append(sum(pixel) / 3)
            samples.append(sum(band) / len(band))
        return max(samples)

    for radius in radii:
        ring = luminance(radius)
        gap = luminance(min(0.95, radius + 0.08))
        if ring <= gap + 8:
            raise SystemExit(f"圆环 {radius} 亮度不足: ring={ring:.1f} gap={gap:.1f}")


if __name__ == "__main__":
    main()
