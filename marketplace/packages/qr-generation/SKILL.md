---
name: qr-generation
description: >-
  Generate styled QR code PNGs — circular dot modules, rounded finder eyes,
  center logo on a white badge with matching outline. Use when creating or
  updating QR assets, changing QR style, logo badge, or regenerating qr-*.png
  files in a project.
title: QR Code Generation
sources:
  - skills/qr-generation/scripts/generate-qr-code.py
  - skills/qr-generation/requirements.txt
---

# QR Code Generation

## In This File

| Section | Description |
|---|---|
| [When to Use](#when-to-use) | Trigger scenarios |
| [Skill Location](#skill-location) | Path after Wingman activation |
| [Setup](#setup) | Python venv per project |
| [Run](#run) | CLI — always execute the script |
| [Styles](#styles) | `--style` presets |
| [Design Defaults](#design-defaults) | Built-in visual rules |
| [Logo Assets](#logo-assets) | File prep before overlay |
| [Project Example](#project-example) | ReWallet invocation |
| [Rules](#rules) | Scanability constraints |

---

## When to Use

- User asks to generate, regenerate, or restyle QR codes
- User changes center logo, dot style, colors, or logo badge frame
- User adds a new branded QR variant to a project

---

## Skill Location

Install from **Wingman Marketplace** (Skills → QR Code Generation → Install). Files land at:

```
~/.wingman/skills/qr-generation/
├── SKILL.md
├── requirements.txt
└── scripts/generate-qr-code.py
```

Run from the **target project root** so `--output-dir` and logo paths resolve correctly.

---

## Setup

One-time per project (use any venv path; `.venv-qr` is a common choice):

```bash
python3 -m venv .venv-qr
.venv-qr/bin/pip install -r ~/.wingman/skills/qr-generation/requirements.txt
```

Ask before installing packages if the project has no venv yet.

---

## Run

**Always execute the skill script** — do not reimplement QR drawing inline.

```bash
.venv-qr/bin/python ~/.wingman/skills/qr-generation/scripts/generate-qr-code.py \
  --output-dir ./assets \
  --logo ./assets/logo.png \
  --logo-alt ./assets/logo-mono.png \
  --url https://example.com \
  --style new-set \
  --scale 2
```

| Flag | Default | Description |
|---|---|---|
| `--output-dir` | `.` | Directory for PNG outputs (created if missing) |
| `--name-prefix` | `qr` | Filename prefix (`qr-black-green-logo.png`) |
| `--logo` | — | Primary center logo (required for logo styles) |
| `--logo-alt` | — | Secondary logo for `black-r-framed` / `new-set` |
| `--url` | `https://example.com` | QR payload URL |
| `--style` | `branded-dark` | See [Styles](#styles) |
| `--scale` | `2` | `1` → 512px QR; `2` → 1024px |
| `--module-style` | `dots` | `dots` or `square` |
| `--output` | — | Override single output path (one style only) |

Paths may be relative to the current working directory.

---

## Styles

| `--style` | Output file(s) | Logo |
|---|---|---|
| `branded-dark` | `{prefix}-black-green-logo.png` | `--logo` (color icon) |
| `black-r-framed` | `{prefix}-black-r-logo.png` | `--logo-alt` or `--logo` |
| `new-set` | Both dark variants above | `--logo` + `--logo-alt` |
| `card` | `{prefix}-card.png` | `--logo` (punch-card layout) |
| `qr-only` | `{prefix}-only.png` | `--logo` |
| `both` | Card + green `qr-only` legacy set | `--logo` |

Primary styled output: **`new-set`** or **`branded-dark`**.

---

## Design Defaults

| Element | Setting |
|---|---|
| Data modules | Circular dots (`CircleModuleDrawer`) |
| Finder patterns | Rounded squares (`RoundedModuleDrawer`, `radius_ratio=1`) |
| Error correction | `H` (required when center logo is present) |
| Outer QR frame | None |
| Center logo | White rounded badge + outline matching QR fill color |
| Dark variants | `#000000` on `#FFFFFF` |
| Green legacy (`card` / `qr-only`) | `#006B5A` on `#F3FBF8` |

**Do not** round the full QR image corners on dark variants — it clips finder patterns and corrupts corner colors.

---

## Logo Assets

| Requirement | Detail |
|---|---|
| Format | PNG with transparency preferred |
| Light backgrounds | Near-white pixels stripped to alpha when `strip_light_background` applies |
| Reject | JPEG mislabeled as PNG, solid-black rectangles (renders as black square) |
| `--logo-alt` | Monochrome / wordmark for dark-on-white QRs |

---

## Project Example

ReWallet (`rewallet-rewards-core`) wrapper at `scripts/generate-qr-code.py` calls this skill with project paths:

```bash
.venv-qr/bin/python scripts/generate-qr-code.py --style new-set --scale 2
```

Equivalent direct invocation from repo root:

```bash
.venv-qr/bin/python ~/.wingman/skills/qr-generation/scripts/generate-qr-code.py \
  --output-dir landing-page \
  --logo landing-page/logo.png \
  --logo-alt landing-page/logo-r-black.png \
  --name-prefix qr-rewallet \
  --url https://re-wallet.com \
  --style new-set \
  --scale 2
```

---

## Rules

1. Run the skill script — never hand-draw QR matrices
2. Keep error correction **H** when overlaying a center logo
3. Resolve paths from project root; confirm printed `Saved …` paths
4. Test scan on a phone after visual changes
5. Ask before `pip install` in user projects
