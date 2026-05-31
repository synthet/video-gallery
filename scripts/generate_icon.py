"""
Generate Driftara Video app icon (public/icon.png + public/favicon.ico).

Matches Vexlum Scoring / Driftara Gallery branding: squircle, blue→magenta
gradient, white layered motif with gradient negative-space cutout.
"""
from __future__ import annotations

import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC = os.path.join(ROOT, "public")
SIZE = 640

# Sampled from Driftara Gallery icon.png
GRAD_TL = (25, 121, 242)
GRAD_TR = (137, 72, 209)
GRAD_BL = (142, 71, 203)
GRAD_BR = (244, 29, 148)

ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _lerp_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(_lerp(c1[0], c2[0], t)),
        int(_lerp(c1[1], c2[1], t)),
        int(_lerp(c1[2], c2[2], t)),
    )


def _bilinear_gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    denom = max(size - 1, 1)
    for y in range(size):
        ty = y / denom
        for x in range(size):
            tx = x / denom
            top = _lerp_rgb(GRAD_TL, GRAD_TR, tx)
            bottom = _lerp_rgb(GRAD_BL, GRAD_BR, tx)
            px[x, y] = _lerp_rgb(top, bottom, ty)
    return img


def _squircle_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def _inner_glow(size: int, radius: int) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    inset = 6
    draw.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=radius - 8,
        outline=(255, 255, 255, 55),
        width=3,
    )
    return layer


def _rounded_rect_mask(w: int, h: int, corner: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=corner, fill=255)
    return mask


def _draw_frame(
    layer: Image.Image,
    box: tuple[int, int, int, int],
    *,
    fill: tuple[int, int, int, int] | None = None,
    outline: tuple[int, int, int, int] | None = None,
    width: int = 0,
    corner: int = 28,
) -> None:
    draw = ImageDraw.Draw(layer)
    if fill:
        draw.rounded_rectangle(box, radius=corner, fill=fill)
    if outline and width:
        draw.rounded_rectangle(box, radius=corner, outline=outline, width=width)


def _play_cutout_mask(w: int, h: int) -> Image.Image:
    """Triangle hole (gradient shows through) — same negative-space idea as Gallery."""
    mask = Image.new("L", (w, h), 255)
    draw = ImageDraw.Draw(mask)
    cx, cy = w // 2, h // 2
    r = int(min(w, h) * 0.19)
    tri = [
        (cx - int(r * 0.55), cy - r),
        (cx - int(r * 0.55), cy + r),
        (cx + int(r * 0.95), cy),
    ]
    draw.polygon(tri, fill=0)
    return mask


def _rotate_layer(layer: Image.Image, degrees: float) -> Image.Image:
    return layer.rotate(degrees, resample=Image.Resampling.BICUBIC, expand=False, center=(SIZE // 2, SIZE // 2))


def _soft_shadow(size: int) -> Image.Image:
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((168, 392, 472, 468), fill=(0, 0, 0, 70))
    return shadow.filter(ImageFilter.GaussianBlur(18))


def render_icon(size: int = SIZE) -> Image.Image:
    radius = int(size * 0.195)
    base_rgb = _bilinear_gradient(size)
    mask = _squircle_mask(size, radius)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base_rgb, mask=mask)
    icon = Image.alpha_composite(icon, _inner_glow(size, radius))
    icon = Image.alpha_composite(icon, _soft_shadow(size))

    frame = int(size * 0.42)
    corner = int(frame * 0.14)
    x0 = int(size * 0.22)
    y0 = int(size * 0.28)
    box = (x0, y0, x0 + frame, y0 + frame)

    # Back frame: white outline, tilted (stacked-media motif like Gallery)
    back = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    back_box = (x0 + int(size * 0.1), y0 - int(size * 0.04), x0 + frame + int(size * 0.1), y0 + frame - int(size * 0.04))
    _draw_frame(back, back_box, outline=(255, 255, 255, 245), width=max(10, size // 52), corner=corner)
    back = _rotate_layer(back, 14)
    icon = Image.alpha_composite(icon, back)

    # Front frame: solid white with play triangle cutout
    front = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    _draw_frame(front, box, fill=(255, 255, 255, 252), corner=corner)
    front_mask = _rounded_rect_mask(frame, frame, corner)
    front_crop = front.crop(box)
    play_mask = _play_cutout_mask(frame, frame)
    front_rgb = Image.new("RGBA", (frame, frame), (255, 255, 255, 252))
    front_rgb.putalpha(ImageChops.multiply(front_mask, play_mask))
    icon.paste(front_rgb, box, front_rgb)

    # Subtle highlight on front frame edge
    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    _draw_frame(highlight, box, outline=(255, 255, 255, 90), width=2, corner=corner)
    icon = Image.alpha_composite(icon, highlight)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(icon, mask=mask)
    return out


def write_assets() -> None:
    os.makedirs(PUBLIC, exist_ok=True)
    icon = render_icon()
    png_path = os.path.join(PUBLIC, "icon.png")
    icon.save(png_path, format="PNG", optimize=True)
    ico_path = os.path.join(PUBLIC, "favicon.ico")
    icon.save(ico_path, format="ICO", sizes=ICO_SIZES)
    print(f"Wrote {png_path} ({os.path.getsize(png_path)} bytes)")
    print(f"Wrote {ico_path} ({os.path.getsize(ico_path)} bytes)")


if __name__ == "__main__":
    write_assets()
