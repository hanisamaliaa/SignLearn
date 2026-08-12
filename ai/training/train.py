from __future__ import annotations

import argparse
import json
import time
from collections import Counter
from datetime import date
from pathlib import Path

import cv2
import joblib
import numpy as np
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score

from .augment import augment_webcam
from .dataset import create_split_manifest, load_manifest
from .features import FEATURE_COUNT, HandFeatureExtractor


def build_features(records, extractor, augmentations, rng):
    features, labels, failed = [], [], []
    for record in records:
        image = cv2.imread(record["path"])
        variants = [image]
        variants.extend(augment_webcam(image, rng) for _ in range(augmentations))
        for variant_index, variant in enumerate(variants):
            values = extractor.extract(variant, normalized=True)
            if values is None:
                failed.append({**record, "variant": variant_index})
                continue
            features.append(values)
            labels.append(record["label"])
    return np.asarray(features), np.asarray(labels), failed


def metrics(model, x, y):
    started = time.perf_counter()
    predictions = model.predict(x)
    elapsed = time.perf_counter() - started
    return {
        "accuracy": accuracy_score(y, predictions),
        "macro_f1": f1_score(y, predictions, average="macro"),
        "weighted_f1": f1_score(y, predictions, average="weighted"),
        "latency_ms_per_sample": elapsed / len(y) * 1000,
        "classification_report": classification_report(y, predictions, output_dict=True, zero_division=0),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/raw/Citra BISINDO"))
    parser.add_argument("--manifest", type=Path, default=Path("data/splits/manifest.json"))
    parser.add_argument("--output", type=Path, default=Path("models/candidates"))
    parser.add_argument("--augmentations", type=int, default=12)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    manifest = create_split_manifest(args.data, args.manifest, args.seed) if not args.manifest.exists() else load_manifest(args.manifest)
    rng = np.random.default_rng(args.seed)
    extractor = HandFeatureExtractor()
    x_train, y_train, failed_train = build_features(manifest["train"], extractor, args.augmentations, rng)
    x_val, y_val, failed_val = build_features(manifest["val"], extractor, 0, rng)
    x_test, y_test, failed_test = build_features(manifest["test"], extractor, 0, rng)
    extractor.close()

    candidates = {
        "random_forest_normalized": RandomForestClassifier(
            n_estimators=400, class_weight="balanced", n_jobs=-1, random_state=args.seed
        ),
        "extra_trees_normalized": ExtraTreesClassifier(
            n_estimators=400, class_weight="balanced", n_jobs=-1, random_state=args.seed
        ),
    }
    args.output.mkdir(parents=True, exist_ok=True)
    results = {}
    for name, model in candidates.items():
        model.fit(x_train, y_train)
        result = {"validation": metrics(model, x_val, y_val), "test": metrics(model, x_test, y_test)}
        model_path = args.output / f"{name}.pkl"
        joblib.dump(model, model_path)
        result["model_path"] = str(model_path)
        result["model_size_bytes"] = model_path.stat().st_size
        results[name] = result

    best_name = max(results, key=lambda name: results[name]["validation"]["macro_f1"])
    metadata = {
        "model_name": best_name,
        "model_version": "2.0.0-candidate",
        "training_date": date.today().isoformat(),
        "dataset": "achmadnoer/alfabet-bisindo",
        "split_policy": "original images split before train-only augmentation",
        "augmentations_per_train_image": args.augmentations,
        "horizontal_flip": False,
        "feature_preprocessing": "wrist-centered and hand-bounding-box-scale-normalized landmarks",
        "input_features": FEATURE_COUNT,
        "classes": sorted(set(y_train)),
        "original_split_counts": {key: len(manifest[key]) for key in ("train", "val", "test")},
        "extracted_counts": {"train": len(y_train), "val": len(y_val), "test": len(y_test)},
        "class_counts_train": Counter(y_train),
        "failed_detection_counts": {"train": len(failed_train), "val": len(failed_val), "test": len(failed_test)},
        "candidates": results,
        "selected_candidate": best_name,
    }
    (args.output / "training_report.json").write_text(json.dumps(metadata, indent=2, default=int), encoding="utf-8")
    np.savez_compressed(args.output / "heldout_features.npz", x_val=x_val, y_val=y_val, x_test=x_test, y_test=y_test)
    print(json.dumps({"selected": best_name, "results": results}, indent=2))


if __name__ == "__main__":
    main()
