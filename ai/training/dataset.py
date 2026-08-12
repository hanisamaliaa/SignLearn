from __future__ import annotations

import json
from pathlib import Path

import numpy as np


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def discover_images(root: Path) -> list[dict[str, str]]:
    records = []
    for image_path in sorted(root.rglob("*")):
        if image_path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        label = image_path.parent.name.upper()
        if len(label) == 1 and label.isalpha():
            records.append({"path": str(image_path), "label": label})
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


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))
