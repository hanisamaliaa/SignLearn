"""Extract production A-Z cards from the approved BISINDO canvas.

The approved canvas is the immutable source of truth for this pipeline. Its
pixels are cropped, placed on a square white canvas, and resampled with Lanczos.
The extraction never redraws, reinterprets, recolours, mirrors, or geometrically
warps a hand pose.

Run from the repository root::

    npm run assets:bisindo
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = ROOT / "scripts/assets/bisindo-canvas-approved-source.png"
DEFAULT_OUTPUT = ROOT / "frontend/src/assets/bisindo"
CONTACT_SHEET = ROOT / "scripts/assets/bisindo-canvas-approved-contact-sheet.webp"
SOURCE_SHA256 = "71cfdcaaddd0f61226c5a95b4b1994da68430f0d7b8544710d53d2b0ea1bee1b"
SOURCE_SIZE = (1254, 1254)
CARD_SIZE = 1024
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
CONTACT_COLUMNS = 6

# Pixel-exact artwork bounds in the approved 1254x1254 canvas. Labels are
# deliberately excluded because the UI renders accessible text itself. The R
# crop includes its movement annotation and the Z crop includes its full sleeve.
# Coordinates are (x0,y0,x1,y1), with the right/bottom edge exclusive.
BOUNDS = {
    "A": (64, 99, 228, 215), "B": (293, 100, 453, 234),
    "C": (504, 106, 615, 226), "D": (664, 100, 812, 216),
    "E": (858, 109, 973, 213), "F": (1028, 110, 1173, 238),
    "G": (83, 298, 228, 429), "H": (300, 304, 447, 435),
    "I": (504, 298, 614, 438), "J": (669, 287, 801, 435),
    "K": (828, 308, 972, 437), "L": (1053, 299, 1164, 436),
    "M": (70, 522, 183, 652), "N": (293, 512, 413, 650),
    "O": (512, 511, 603, 651), "P": (650, 522, 809, 653),
    "Q": (846, 511, 981, 648), "R": (1065, 511, 1173, 648),
    "S": (51, 735, 201, 867), "T": (281, 735, 448, 874),
    "U": (512, 736, 577, 882), "V": (664, 736, 742, 885),
    "W": (828, 745, 972, 890), "X": (1015, 761, 1202, 893),
    "Y": (66, 930, 184, 1098), "Z": (293, 949, 417, 1098),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_source(path: Path) -> np.ndarray:
    if not path.is_file():
        raise FileNotFoundError(f"Sheet sumber tidak ditemukan: {path}")
    if path.resolve() == DEFAULT_SOURCE.resolve():
        actual_hash = sha256(path)
        if actual_hash != SOURCE_SHA256:
            raise ValueError(
                "Sheet sumber berubah. Hentikan build agar pose tidak terganti "
                f"diam-diam (SHA-256 {actual_hash})."
            )

    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Sheet sumber tidak dapat dibaca: {path}")
    height, width = image.shape[:2]
    if (width, height) != SOURCE_SIZE:
        raise ValueError(
            f"Ukuran sheet harus {SOURCE_SIZE[0]}x{SOURCE_SIZE[1]}; "
            f"ditemukan {width}x{height}."
        )
    return image


def crop_artwork(
    source: np.ndarray,
    bounds: tuple[int, int, int, int],
    letter: str,
) -> np.ndarray:
    """Remove the printed label while retaining original artwork pixels."""
    x0, y0, x1, y1 = bounds
    if not (0 <= x0 < x1 <= source.shape[1] and 0 <= y0 < y1 <= source.shape[0]):
        raise ValueError(f"Batas crop di luar canvas: {bounds}")
    crop = source[y0:y1, x0:x1].copy()

    # R's movement annotation is intentionally disconnected from the hand, and
    # its audited crop already excludes the printed letter. Keep the full crop.
    if letter == "R":
        return crop

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    foreground = (gray < 242).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(foreground, 8)
    if count <= 1:
        raise ValueError(f"Tidak menemukan gambar tangan pada crop {letter}")

    component = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    selected = (labels == component).astype(np.uint8)
    selected = cv2.dilate(selected, np.ones((3, 3), np.uint8), iterations=1)
    bx, by, bw, bh = cv2.boundingRect(selected)
    keep = selected[by : by + bh, bx : bx + bw].astype(bool)
    original = crop[by : by + bh, bx : bx + bw]
    artwork = np.full_like(original, 255)
    artwork[keep] = original[keep]
    return artwork


def make_card(
    source: np.ndarray,
    bounds: tuple[int, int, int, int],
    letter: str,
) -> np.ndarray:
    artwork = crop_artwork(source, bounds, letter)
    height, width = artwork.shape[:2]
    side = max(height, width)

    # A consistent 18% margin makes wrists and fingertips breathe without
    # trimming any approved source pixel. Only white canvas is added.
    padded_side = int(np.ceil(side * 1.36))
    canvas = np.full((padded_side, padded_side, 3), 255, dtype=np.uint8)
    top = (padded_side - height) // 2
    left = (padded_side - width) // 2
    canvas[top : top + height, left : left + width] = artwork

    # Lanczos changes resolution only.  No denoising, sharpening, colour
    # correction, mirroring, perspective transform, or generative fill occurs.
    return cv2.resize(
        canvas,
        (CARD_SIZE, CARD_SIZE),
        interpolation=cv2.INTER_LANCZOS4,
    )


def render(source_path: Path, output: Path) -> None:
    source = load_source(source_path)
    output.mkdir(parents=True, exist_ok=True)
    cards: list[np.ndarray] = []

    for letter in ALPHABET:
        card = make_card(source, BOUNDS[letter], letter)
        target = output / f"{letter.lower()}.webp"
        write_lossless_webp(target, card)
        cards.append(card)

    build_contact_sheet(cards)
    write_provenance(output, source_path)
    write_manifest(output, source_path)
    print(f"26 kartu BISINDO 1024x1024 ditulis ke {output}")


def write_lossless_webp(target: Path, image: np.ndarray) -> None:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(target, "WEBP", lossless=True, quality=100, method=6)
    decoded = cv2.imread(str(target), cv2.IMREAD_COLOR)
    if decoded is None or decoded.shape != image.shape:
        raise OSError(f"Verifikasi dimensi gagal untuk {target}")
    if not np.array_equal(decoded, image):
        raise OSError(f"Encoder mengubah piksel {target}; lossless wajib.")


def build_contact_sheet(cards: list[np.ndarray]) -> None:
    thumb = 220
    labelled: list[np.ndarray] = []
    for letter, card in zip(ALPHABET, cards):
        cell = cv2.resize(card, (thumb, thumb), interpolation=cv2.INTER_AREA)
        cv2.rectangle(cell, (0, thumb - 34), (thumb, thumb), (255, 255, 255), -1)
        cv2.putText(
            cell,
            letter,
            (thumb // 2 - 11, thumb - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (24, 32, 48),
            2,
            cv2.LINE_AA,
        )
        labelled.append(cell)
    while len(labelled) % CONTACT_COLUMNS:
        labelled.append(np.full((thumb, thumb, 3), 255, dtype=np.uint8))
    sheet = np.vstack(
        [
            np.hstack(labelled[index : index + CONTACT_COLUMNS])
            for index in range(0, len(labelled), CONTACT_COLUMNS)
        ]
    )
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    write_lossless_webp(CONTACT_SHEET, sheet)


def write_provenance(output: Path, source_path: Path) -> None:
    rows = "\n".join(
        f"| {letter} | `{','.join(map(str, BOUNDS[letter]))}` |"
        for letter in ALPHABET
    )
    text = f"""# Provenans aset abjad BISINDO A-Z

Sumber produksi tunggal: `{source_path.name}`, hasil edit built-in imagegen dari
gambar referensi yang diberikan pemilik proyek dan telah disetujui di canvas.

- Ukuran sumber: {SOURCE_SIZE[0]}x{SOURCE_SIZE[1]} piksel
- SHA-256: `{sha256(source_path)}`
- Transformasi setelah persetujuan: crop persegi panjang yang diaudit, isolasi
  gambar dari label cetak, padding putih, dan resampling Lanczos menjadi WebP
  lossless 1024x1024; anotasi gerak R dipertahankan utuh
- Tidak dilakukan setelah persetujuan: generasi ulang, perubahan pose,
  mirroring, rotasi, perspective warp, recolouring, atau generative fill

Hak penggunaan/publikasi gambar sumber harus dipastikan oleh pemilik proyek;
file yang diberikan tidak memuat metadata lisensi yang dapat diverifikasi.

| Huruf | Batas crop sumber (x0,y0,x1,y1) |
| --- | --- |
{rows}
"""
    (output / "ATTRIBUTION.md").write_text(text, encoding="utf-8")


def write_manifest(output: Path, source_path: Path) -> None:
    assets = {}
    for letter in ALPHABET:
        path = output / f"{letter.lower()}.webp"
        decoded = cv2.imread(str(path), cv2.IMREAD_COLOR)
        assets[letter] = {
            "file": path.name,
            "sha256": sha256(path),
            "width": int(decoded.shape[1]),
            "height": int(decoded.shape[0]),
            "sourceCropBounds": list(BOUNDS[letter]),
        }
    manifest = {
        "source": source_path.name,
        "sourceSha256": sha256(source_path),
        "transformation": "audited-crop + label-isolation + white-padding + Lanczos resampling",
        "lossless": True,
        "assets": assets,
    }
    (output / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    render(args.source, args.output)


if __name__ == "__main__":
    main()
