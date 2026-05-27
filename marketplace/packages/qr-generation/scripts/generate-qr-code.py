#!/usr/bin/env python3
"""Styled QR PNG generator. See ~/.wingman/skills/qr-generation/SKILL.md."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import qrcode
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
from qrcode.image.styles.moduledrawers import CircleModuleDrawer, RoundedModuleDrawer

SKILL_DIR = Path(__file__).resolve().parents[1]

COLORS = {
    "bg_top": (243, 251, 248),
    "bg_bottom": (224, 247, 241),
    "border": (0, 107, 90),
    "border_soft": (0, 201, 167),
    "primary": (0, 168, 143),
    "primary_dark": (0, 107, 90),
    "punch_filled": (0, 201, 167),
    "punch_empty": (0, 107, 90, 60),
    "white": (255, 255, 255),
    "text": (8, 35, 31),
    "text_muted": (60, 90, 82),
}


def resolve_path(path: Path, base: Path) -> Path:
    return path if path.is_absolute() else (base / path).resolve()


def require_logo(logo: Path | None, style: str) -> Path:
    if logo is None:
        print(f"error: --logo is required for style '{style}'", file=sys.stderr)
        sys.exit(1)
    if not logo.is_file():
        print(f"error: logo not found: {logo}", file=sys.stderr)
        sys.exit(1)
    return logo


def rtl(text: str) -> str:
    return get_display(text)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def draw_vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    gradient = Image.new("RGB", size, top)
    draw = ImageDraw.Draw(gradient)
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return gradient


def rounded_rectangle(draw: ImageDraw.ImageDraw, box, radius: int, fill=None, outline=None, width: int = 1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def parse_hex_color(color: str) -> tuple[int, int, int]:
    value = color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def create_qr(
    url: str,
    size: int,
    fill_color: str = "#006B5A",
    back_color: str = "#F3FBF8",
    module_style: str = "dots",
    rounded_eyes: bool = True,
) -> Image.Image:
    box_size = 10
    border = 2
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(url)
    qr.make(fit=True)

    if module_style == "dots":
        fg = parse_hex_color(fill_color)
        bg = parse_hex_color(back_color)
        eye_drawer = RoundedModuleDrawer(radius_ratio=1) if rounded_eyes else CircleModuleDrawer()
        qr_img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=CircleModuleDrawer(),
            eye_drawer=eye_drawer,
            color_mask=SolidFillColorMask(back_color=bg, front_color=fg),
        ).convert("RGBA")
        resample = Image.Resampling.LANCZOS
    else:
        qr_img = qr.make_image(
            fill_color=fill_color,
            back_color=back_color,
        ).convert("RGBA")
        resample = Image.Resampling.NEAREST

    return qr_img.resize((size, size), resample)


def prepare_logo(logo_path: Path, *, strip_light_background: bool = True) -> Image.Image:
    logo = Image.open(logo_path).convert("RGBA")
    pixels = logo.load()
    width, height = logo.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if strip_light_background and r > 240 and g > 240 and b > 240:
                pixels[x, y] = (0, 0, 0, 0)
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    return logo


def overlay_logo(
    qr_img: Image.Image,
    logo_path: Path,
    scale: float = 0.24,
    badge_fill: tuple[int, int, int, int] = (255, 255, 255, 255),
    strip_light_background: bool = False,
    badge_outline: tuple[int, int, int, int] | None = None,
    badge_outline_width: int = 4,
) -> Image.Image:
    qr = qr_img.copy()
    logo = (
        prepare_logo(logo_path, strip_light_background=strip_light_background)
        if strip_light_background
        else Image.open(logo_path).convert("RGBA")
    )

    logo_max = int(qr.width * scale)
    logo.thumbnail((logo_max, logo_max), Image.Resampling.LANCZOS)

    pad = int(max(logo.width, logo.height) * 0.16)
    badge_size = max(logo.width, logo.height) + pad * 2
    badge = Image.new("RGBA", (badge_size, badge_size), (0, 0, 0, 0))
    badge_draw = ImageDraw.Draw(badge)
    badge_radius = int(badge_size * 0.22)
    badge_box = (0, 0, badge_size - 1, badge_size - 1)
    if badge_outline:
        badge_draw.rounded_rectangle(
            badge_box,
            radius=badge_radius,
            fill=badge_fill,
            outline=badge_outline,
            width=badge_outline_width,
        )
    else:
        badge_draw.rounded_rectangle(badge_box, radius=badge_radius, fill=badge_fill)
    logo_x = (badge_size - logo.width) // 2
    logo_y = (badge_size - logo.height) // 2
    badge.paste(logo, (logo_x, logo_y), logo)

    position = ((qr.width - badge_size) // 2, (qr.height - badge_size) // 2)
    qr.paste(badge, position, badge)
    return qr


def draw_punch_row(draw: ImageDraw.ImageDraw, center_x: int, y: int, count: int = 8, filled: int = 3, radius: int = 14, gap: int = 18):
    total_width = count * radius * 2 + (count - 1) * gap
    start_x = center_x - total_width // 2 + radius

    for index in range(count):
        x = start_x + index * (radius * 2 + gap)
        if index < filled:
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=COLORS["punch_filled"],
                outline=COLORS["primary_dark"],
                width=2,
            )
        else:
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=COLORS["white"],
                outline=COLORS["primary_dark"],
                width=2,
            )


def round_image_corners(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=radius, fill=255)
    rounded = Image.new("RGBA", image.size, (0, 0, 0, 0))
    rounded.paste(image, (0, 0), mask)
    return rounded


def output_name(prefix: str, suffix: str) -> str:
    return f"{prefix}-{suffix}.png" if prefix else f"{suffix}.png"


def generate_framed_qr(
    url: str,
    logo_path: Path,
    output_path: Path,
    *,
    qr_fill: str,
    qr_back: str,
    scale: int = 1,
    logo_scale: float = 0.24,
    strip_light_logo: bool = False,
    module_style: str = "dots",
) -> Path:
    qr_size = 512 * scale

    qr = create_qr(url, qr_size, fill_color=qr_fill, back_color=qr_back, module_style=module_style)
    badge_outline = (*parse_hex_color(qr_fill), 255)
    badge_outline_width = max(4, scale * 2)
    qr = overlay_logo(
        qr,
        logo_path,
        scale=logo_scale,
        strip_light_background=strip_light_logo,
        badge_outline=badge_outline,
        badge_outline_width=badge_outline_width,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    qr.save(output_path, format="PNG", optimize=True)
    return output_path


def generate_qr_only(
    url: str,
    logo_path: Path,
    output_path: Path,
    scale: int = 1,
    module_style: str = "dots",
) -> Path:
    qr_size = 512 * scale
    qr = create_qr(url, qr_size, module_style=module_style)
    qr = overlay_logo(qr, logo_path)
    qr = round_image_corners(qr, radius=32 * scale)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    qr.save(output_path, format="PNG", optimize=True)
    return output_path


def generate_card(
    url: str,
    logo_path: Path,
    output_path: Path,
    *,
    scale: int = 1,
    module_style: str = "dots",
    brand_name: str = "Brand",
    subtitle: str = "",
    footer: str = "",
    scan_hint: str = "",
) -> Path:
    card_width = 640 * scale
    card_height = 860 * scale
    qr_size = 420 * scale
    card_radius = 40 * scale

    card = draw_vertical_gradient((card_width, card_height), COLORS["bg_top"], COLORS["bg_bottom"]).convert("RGBA")
    draw = ImageDraw.Draw(card)

    rounded_rectangle(
        draw,
        (8 * scale, 8 * scale, card_width - 9 * scale, card_height - 9 * scale),
        radius=card_radius,
        outline=COLORS["border_soft"],
        width=3 * scale,
    )
    rounded_rectangle(
        draw,
        (16 * scale, 16 * scale, card_width - 17 * scale, card_height - 17 * scale),
        radius=card_radius - 4 * scale,
        outline=COLORS["border"],
        width=2 * scale,
    )

    title_font = load_font(34 * scale, bold=True)
    subtitle_font = load_font(22 * scale)
    url_font = load_font(20 * scale, bold=True)
    small_font = load_font(16 * scale)

    title_bbox = draw.textbbox((0, 0), brand_name, font=title_font)
    title_w = title_bbox[2] - title_bbox[0]
    draw.text(((card_width - title_w) / 2, 42 * scale), brand_name, fill=COLORS["primary_dark"], font=title_font)

    if subtitle:
        subtitle_text = rtl(subtitle)
        subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
        subtitle_w = subtitle_bbox[2] - subtitle_bbox[0]
        draw.text(((card_width - subtitle_w) / 2, 88 * scale), subtitle_text, fill=COLORS["text"], font=subtitle_font)

    qr = create_qr(url, qr_size, module_style=module_style)
    qr = overlay_logo(qr, logo_path)
    qr_x = (card_width - qr_size) // 2
    qr_y = 140 * scale

    qr_frame_pad = 18 * scale
    rounded_rectangle(
        draw,
        (
            qr_x - qr_frame_pad,
            qr_y - qr_frame_pad,
            qr_x + qr_size + qr_frame_pad,
            qr_y + qr_size + qr_frame_pad,
        ),
        radius=28 * scale,
        fill=COLORS["white"],
        outline=COLORS["border_soft"],
        width=2 * scale,
    )
    card.paste(qr, (qr_x, qr_y), qr)

    draw_punch_row(draw, card_width // 2, qr_y + qr_size + 72 * scale, count=8, filled=3, radius=14 * scale, gap=16 * scale)

    if scan_hint:
        hint = rtl(scan_hint)
        hint_bbox = draw.textbbox((0, 0), hint, font=small_font)
        hint_w = hint_bbox[2] - hint_bbox[0]
        draw.text(((card_width - hint_w) / 2, qr_y + qr_size + 112 * scale), hint, fill=COLORS["text_muted"], font=small_font)

    if footer:
        footer_bbox = draw.textbbox((0, 0), footer, font=url_font)
        footer_w = footer_bbox[2] - footer_bbox[0]
        draw.text(((card_width - footer_w) / 2, card_height - 58 * scale), footer, fill=COLORS["primary_dark"], font=url_font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    card.save(output_path, format="PNG", optimize=True)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate styled QR code PNG assets")
    parser.add_argument("--url", default="https://example.com", help="QR destination URL")
    parser.add_argument("--logo", type=Path, help="Primary center logo image")
    parser.add_argument("--logo-alt", type=Path, help="Secondary logo (monochrome / wordmark)")
    parser.add_argument("--output-dir", type=Path, default=Path("."), help="Output directory for PNG files")
    parser.add_argument("--name-prefix", default="qr", help="Output filename prefix")
    parser.add_argument("--output", type=Path, help="Override output path for a single style")
    parser.add_argument(
        "--style",
        choices=(
            "card",
            "qr-only",
            "both",
            "branded-dark",
            "black-green-framed",
            "black-r-framed",
            "new-set",
        ),
        default="branded-dark",
        help=(
            "branded-dark / black-green-framed = dark QR + color logo; "
            "black-r-framed = dark QR + alt logo; new-set = both dark variants; "
            "card / qr-only / both = green legacy set"
        ),
    )
    parser.add_argument("--scale", type=int, default=2, help="Render scale (2 → ~1024px QR)")
    parser.add_argument(
        "--module-style",
        choices=("dots", "square"),
        default="dots",
        help="QR module shape",
    )
    parser.add_argument("--brand-name", default="Brand", help="Card title text")
    parser.add_argument("--subtitle", default="", help="Card subtitle (RTL supported via bidi)")
    parser.add_argument("--footer", default="", help="Card footer text")
    parser.add_argument("--scan-hint", default="", help="Card scan hint text")
    args = parser.parse_args()

    base = Path.cwd()
    output_dir = resolve_path(args.output_dir, base)
    logo = resolve_path(args.logo, base) if args.logo else None
    logo_alt = resolve_path(args.logo_alt, base) if args.logo_alt else None
    prefix = args.name_prefix.strip()

    paths = {
        "card": output_dir / output_name(prefix, "card"),
        "qr_only": output_dir / output_name(prefix, "only"),
        "black_green": output_dir / output_name(prefix, "black-green-logo"),
        "black_r": output_dir / output_name(prefix, "black-r-logo"),
    }

    dark_color_styles = {"branded-dark", "black-green-framed"}

    if args.style in ("card", "both"):
        logo_path = require_logo(logo, args.style)
        card_output = args.output or paths["card"]
        if args.style == "both":
            card_output = paths["card"]
        path = generate_card(
            args.url,
            logo_path,
            card_output,
            scale=args.scale,
            module_style=args.module_style,
            brand_name=args.brand_name,
            subtitle=args.subtitle,
            footer=args.footer,
            scan_hint=args.scan_hint,
        )
        print(f"Saved {path}")

    if args.style in ("qr-only", "both"):
        logo_path = require_logo(logo, args.style)
        qr_output = args.output or paths["qr_only"]
        if args.style == "both":
            qr_output = paths["qr_only"]
        path = generate_qr_only(args.url, logo_path, qr_output, scale=args.scale, module_style=args.module_style)
        print(f"Saved {path}")

    if args.style in dark_color_styles | {"new-set"}:
        logo_path = require_logo(logo, args.style)
        path = generate_framed_qr(
            args.url,
            logo_path,
            args.output or paths["black_green"],
            qr_fill="#000000",
            qr_back="#FFFFFF",
            scale=args.scale,
            module_style=args.module_style,
        )
        print(f"Saved {path}")

    if args.style in ("black-r-framed", "new-set"):
        mono_logo = logo_alt or logo
        mono_logo = require_logo(mono_logo, args.style)
        path = generate_framed_qr(
            args.url,
            mono_logo,
            args.output or paths["black_r"],
            qr_fill="#000000",
            qr_back="#FFFFFF",
            scale=args.scale,
            logo_scale=0.22,
            strip_light_logo=True,
            module_style=args.module_style,
        )
        print(f"Saved {path}")


if __name__ == "__main__":
    main()
