from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}
SIGNER_SUFFIX_PATTERN = re.compile(r"_[0-9]+(?P<suffix>_2|_3|_AR)?$", re.IGNORECASE)


def infer_capture_group(image_path: Path) -> str:
    """Infer the Mendeley capture/signer group encoded in its filenames."""
    match = SIGNER_SUFFIX_PATTERN.search(image_path.stem)
    if not match:
        return "unknown"
    return (match.group("suffix") or "base").lstrip("_").upper()


def discover_images(root: Path) -> list[dict[str, str]]:
    records = []
    for image_path in sorted(root.rglob("*")):
        if image_path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        label = image_path.parent.name.upper()
        if len(label) == 1 and label.isalpha():
            records.append(
                {
                    "path": str(image_path),
                    "label": label,
                    "group": infer_capture_group(image_path),
                }
            )
    return records


def create_split_manifest(root: Path, output: Path, seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    records = discover_images(root)
    by_label: dict[str, list[dict[str, str]]] = {}
    for record in records:
        by_label.setdefault(record["label"], []).append(record)

    manifest = {"seed": seed, "source": str(root), "train": [], "val": [], "test": []}
    for label, items in sorted(by_label.items()):
        shuffled = [items[index] for index in rng.permutation(len(items))]
        test_count = max(1, round(len(items) * 0.17))
        val_count = max(1, round(len(items) * 0.17))
        manifest["test"].extend(shuffled[:test_count])
        manifest["val"].extend(shuffled[test_count:test_count + val_count])
        manifest["train"].extend(shuffled[test_count + val_count:])

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def create_group_split_manifest(
    root: Path,
    output: Path,
    validation_group: str = "2",
    test_group: str = "3",
) -> dict:
    """Split complete capture groups to prevent adjacent-frame leakage.

    The Mendeley dataset filenames encode two complete, 30-frame-per-class
    signer groups as ``_2`` and ``_3``.  They are reserved wholesale for
    validation and test; all other capture groups are training-only.
    """
    validation_group = validation_group.upper()
    test_group = test_group.upper()
    records = discover_images(root)
    manifest = {
        "source": str(root),
        "split_policy": "capture/signer groups held out wholesale",
        "validation_group": validation_group,
        "test_group": test_group,
        "train": [],
        "val": [],
        "test": [],
    }
    for record in records:
        if record["group"] == validation_group:
            manifest["val"].append(record)
        elif record["group"] == test_group:
            manifest["test"].append(record)
        else:
            manifest["train"].append(record)

    labels = {record["label"] for record in records}
    for split in ("train", "val", "test"):
        split_labels = {record["label"] for record in manifest[split]}
        if split_labels != labels:
            missing = sorted(labels - split_labels)
            raise ValueError(f"Split {split} is missing labels: {missing}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))
