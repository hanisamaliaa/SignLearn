from __future__ import annotations

import argparse
import csv
import json
import time
from pathlib import Path

import cv2
import joblib
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

from .dataset import load_manifest
from .features import HandFeatureExtractor


def extract(records, extractor, normalized):
    x, y = [], []
    for record in records:
        image = cv2.imread(record["path"])
        values = extractor.extract(image, normalized=normalized)
        if values is not None:
            x.append(values)
            y.append(record["label"])
    return np.asarray(x), np.asarray(y)


def evaluate(model, x, y):
    started = time.perf_counter()
    predicted = model.predict(x)
    elapsed = time.perf_counter() - started
    return predicted, {
        "samples": len(y),
        "accuracy": accuracy_score(y, predicted),
        "macro_f1": f1_score(y, predicted, average="macro"),
        "weighted_f1": f1_score(y, predicted, average="weighted"),
        "latency_ms_per_sample": elapsed / len(y) * 1000,
        "estimated_model_fps": len(y) / elapsed,
        "classification_report": classification_report(y, predicted, output_dict=True, zero_division=0),
    }


def _distribution(values):
    if not len(values):
        return {"count": 0}
    return {
        "count": int(len(values)),
        "min": float(np.min(values)),
        "q25": float(np.quantile(values, 0.25)),
        "median": float(np.median(values)),
        "mean": float(np.mean(values)),
        "q75": float(np.quantile(values, 0.75)),
        "max": float(np.max(values)),
    }


def confidence_distribution(model, x, y):
    probabilities = model.predict_proba(x)
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    top1 = probabilities[np.arange(len(x)), order[:, 0]]
    top2 = probabilities[np.arange(len(x)), order[:, 1]]
    predicted = model.classes_[order[:, 0]]
    correct = predicted == y
    margins = top1 - top2
    return {
        "correct_top1_confidence": _distribution(top1[correct]),
        "incorrect_top1_confidence": _distribution(top1[~correct]),
        "correct_margin": _distribution(margins[correct]),
        "incorrect_margin": _distribution(margins[~correct]),
    }


def calibrate_threshold(model, x, y):
    probabilities = model.predict_proba(x)
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    top1 = probabilities[np.arange(len(x)), order[:, 0]]
    top2 = probabilities[np.arange(len(x)), order[:, 1]]
    predicted = model.classes_[order[:, 0]]
    curve = []
    for threshold in (0.40, 0.50, 0.55, 0.60, 0.70):
        for min_margin in (0.03, 0.05, 0.08, 0.12):
            accepted = (top1 >= threshold) & ((top1 - top2) >= min_margin)
            accepted_count = int(accepted.sum())
            accepted_accuracy = float((predicted[accepted] == y[accepted]).mean()) if accepted_count else 0.0
            curve.append({
                "min_confidence": threshold,
                "min_margin": min_margin,
                "accepted_samples": accepted_count,
                "total_detected_test_samples": len(y),
                "accepted_accuracy": accepted_accuracy,
            })
    return curve


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("data/splits/manifest.json"))
    parser.add_argument("--old-model", type=Path, default=Path("models/rf_bisindo_99.pkl"))
    parser.add_argument("--new-model", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("reports/model_comparison.json"))
    args = parser.parse_args()
    manifest = load_manifest(args.manifest)
    extractor = HandFeatureExtractor()
    old_x, old_y = extract(manifest["test"], extractor, normalized=False)
    new_x, new_y = extract(manifest["test"], extractor, normalized=True)
    extractor.close()

    old_model, new_model = joblib.load(args.old_model), joblib.load(args.new_model)
    old_pred, old_metrics = evaluate(old_model, old_x, old_y)
    new_pred, new_metrics = evaluate(new_model, new_x, new_y)
    old_metrics["model_size_bytes"] = args.old_model.stat().st_size
    new_metrics["model_size_bytes"] = args.new_model.stat().st_size
    comparison = {
        "same_original_test_split": True,
        "old_model_training_leakage_warning": "The legacy model was trained after augmentation-before-split, so its score on these source images can be optimistic.",
        "latency_scope": "Classifier predict() only; MediaPipe hand detection latency is shared and excluded.",
        "production_confidence_distribution": confidence_distribution(old_model, old_x, old_y),
        "production_threshold_calibration": calibrate_threshold(old_model, old_x, old_y),
        "old_model": old_metrics,
        "new_model": new_metrics,
        "difference": {
            "accuracy": new_metrics["accuracy"] - old_metrics["accuracy"],
            "macro_f1": new_metrics["macro_f1"] - old_metrics["macro_f1"],
            "latency_ms": new_metrics["latency_ms_per_sample"] - old_metrics["latency_ms_per_sample"],
        },
        "production_replacement_recommended": bool(new_metrics["macro_f1"] > old_metrics["macro_f1"]),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(comparison, indent=2), encoding="utf-8")
    labels = sorted(set(new_y))
    for filename, truth, predicted in (
        ("old_model_confusion_matrix.csv", old_y, old_pred),
        ("new_model_confusion_matrix.csv", new_y, new_pred),
    ):
        with args.output.with_name(filename).open("w", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["actual/predicted", *labels])
            for label, row in zip(labels, confusion_matrix(truth, predicted, labels=labels)):
                writer.writerow([label, *row])
    print(json.dumps(comparison, indent=2))


if __name__ == "__main__":
    main()
