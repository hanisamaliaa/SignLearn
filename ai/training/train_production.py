from __future__ import annotations

import argparse
import hashlib
import json
import time
from collections import Counter
from datetime import date
from pathlib import Path

import cv2
import joblib
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from ai.app.landmarks import (
    FEATURE_SCHEMA_VERSION,
    FrameObservation,
    GEOMETRY_FEATURE_COUNT,
    HandObservation,
    MAX_INTERACTING_HAND_GAP,
    HandLandmarkExtractor,
    build_features,
    observation_tensor,
)
from .dataset import create_group_split_manifest, discover_images, load_manifest


def _extract_split(records, extractor, split_name):
    features, mirrored, raw, masks = [], [], [], []
    labels, paths, metadata, failed = [], [], [], []
    started = time.perf_counter()
    for index, record in enumerate(records, start=1):
        image = cv2.imread(record["path"])
        if image is None:
            failed.append({**record, "reason": "decode_failed"})
            continue
        observation = extractor.observe(image)
        if observation is None:
            failed.append({**record, "reason": "no_hands"})
            continue
        features.append(build_features(observation, mode="geometry"))
        mirrored.append(build_features(observation, mode="geometry", mirror=True))
        raw_points, hand_masks = observation_tensor(
            observation, prune_irrelevant=False
        )
        raw.append(raw_points)
        masks.append(hand_masks)
        labels.append(record["label"])
        paths.append(record["path"])
        metadata.append(
            (
                observation.hands_detected,
                len(observation.relevant_hands),
                observation.hand_span,
            )
        )
        if index % 250 == 0 or index == len(records):
            elapsed = time.perf_counter() - started
            print(
                f"[{split_name}] {index}/{len(records)} images, "
                f"{len(features)} detected, {elapsed:.1f}s",
                flush=True,
            )
    return {
        "x": np.asarray(features, dtype=np.float64),
        "x_mirrored": np.asarray(mirrored, dtype=np.float64),
        "raw_landmarks": np.asarray(raw, dtype=np.float64),
        "hand_masks": np.asarray(masks, dtype=np.float64),
        "y": np.asarray(labels),
        "paths": np.asarray(paths),
        "observation_metadata": np.asarray(metadata, dtype=np.float64),
        "failed": failed,
        "total": len(records),
    }


def _build_feature_cache(manifest, cache_path):
    extractor = HandLandmarkExtractor(static_image_mode=True)
    try:
        splits = {
            name: _extract_split(manifest[key], extractor, name)
            for name, key in (("train", "train"), ("val", "val"), ("test", "test"))
        }
    finally:
        extractor.close()

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_values = {"feature_schema": np.asarray(FEATURE_SCHEMA_VERSION)}
    fields = (
        "x",
        "x_mirrored",
        "raw_landmarks",
        "hand_masks",
        "y",
        "paths",
        "observation_metadata",
    )
    for name, values in splits.items():
        for field in fields:
            cache_values[f"{name}_{field}"] = values[field]
        cache_values[f"{name}_total"] = np.asarray(values["total"])
        cache_values[f"{name}_failed"] = np.asarray(
            [json.dumps(item) for item in values["failed"]]
        )
    np.savez_compressed(cache_path, **cache_values)
    return splits


def _rebuild_from_landmark_cache(source_path, cache_path):
    """Recompute features from cached MediaPipe output without rerunning it.

    Long MediaPipe graph runs can terminate inside the native runtime on some
    Windows builds. Raw landmarks are model-independent, so reusing them is
    both deterministic and materially faster than detecting the same images
    again.
    """
    source = np.load(source_path, allow_pickle=False)
    splits = {}
    for name in ("train", "val", "test"):
        raw = source[f"{name}_raw_landmarks"]
        masks = source[f"{name}_hand_masks"]
        features, mirrored, relevant_counts = [], [], []
        for slots, hand_masks in zip(raw, masks):
            observation = FrameObservation(
                tuple(
                    HandObservation(handedness="", points=points)
                    for points, present in zip(slots, hand_masks)
                    if present
                )
            )
            features.append(build_features(observation, mode="geometry"))
            mirrored.append(
                build_features(observation, mode="geometry", mirror=True)
            )
            relevant_counts.append(len(observation.relevant_hands))

        old_metadata = source[f"{name}_observation_metadata"]
        hand_spans = old_metadata[:, -1]
        splits[name] = {
            "x": np.asarray(features, dtype=np.float64),
            "x_mirrored": np.asarray(mirrored, dtype=np.float64),
            "raw_landmarks": raw,
            "hand_masks": masks,
            "y": source[f"{name}_y"],
            "paths": source[f"{name}_paths"],
            "observation_metadata": np.column_stack(
                (masks.sum(axis=1), relevant_counts, hand_spans)
            ),
            "failed": [
                json.loads(str(item)) for item in source[f"{name}_failed"]
            ],
            "total": int(source[f"{name}_total"]),
        }

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_values = {"feature_schema": np.asarray(FEATURE_SCHEMA_VERSION)}
    fields = (
        "x",
        "x_mirrored",
        "raw_landmarks",
        "hand_masks",
        "y",
        "paths",
        "observation_metadata",
    )
    for name, values in splits.items():
        for field in fields:
            cache_values[f"{name}_{field}"] = values[field]
        cache_values[f"{name}_total"] = np.asarray(values["total"])
        cache_values[f"{name}_failed"] = np.asarray(
            [json.dumps(item) for item in values["failed"]]
        )
    np.savez_compressed(cache_path, **cache_values)
    return splits


def _load_or_build_features(manifest, cache_path, rebuild):
    if rebuild or not cache_path.exists():
        return _build_feature_cache(manifest, cache_path)
    cache = np.load(cache_path, allow_pickle=False)
    schema = str(cache["feature_schema"])
    if schema != FEATURE_SCHEMA_VERSION:
        raise ValueError(
            f"Feature cache uses {schema}; expected {FEATURE_SCHEMA_VERSION}. "
            "Run again with --rebuild-cache."
        )
    fields = (
        "x",
        "x_mirrored",
        "raw_landmarks",
        "hand_masks",
        "y",
        "paths",
        "observation_metadata",
    )
    splits = {}
    for name in ("train", "val", "test"):
        splits[name] = {field: cache[f"{name}_{field}"] for field in fields}
        splits[name]["total"] = int(cache[f"{name}_total"])
        splits[name]["failed"] = [
            json.loads(str(item)) for item in cache[f"{name}_failed"]
        ]
    return splits


def _load_or_build_auxiliary(data_path, cache_path, rebuild):
    if rebuild or not cache_path.exists():
        extractor = HandLandmarkExtractor(static_image_mode=True)
        try:
            auxiliary = _extract_split(
                discover_images(data_path), extractor, "auxiliary"
            )
        finally:
            extractor.close()
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            cache_path,
            feature_schema=np.asarray(FEATURE_SCHEMA_VERSION),
            x=auxiliary["x"],
            x_mirrored=auxiliary["x_mirrored"],
            y=auxiliary["y"],
            total=np.asarray(auxiliary["total"]),
            failed=np.asarray(
                [json.dumps(item) for item in auxiliary["failed"]]
            ),
        )
        return auxiliary

    cache = np.load(cache_path, allow_pickle=False)
    schema = str(cache["feature_schema"])
    if schema != FEATURE_SCHEMA_VERSION:
        raise ValueError(
            f"Auxiliary cache uses {schema}; expected {FEATURE_SCHEMA_VERSION}."
        )
    return {
        "x": cache["x"],
        "x_mirrored": cache["x_mirrored"],
        "y": cache["y"],
        "total": int(cache["total"]),
        "failed": [json.loads(str(item)) for item in cache["failed"]],
    }


def _load_or_build_landmark_auxiliary(data_path, cache_path, frame_index, rebuild):
    if not rebuild and cache_path.exists():
        cache = np.load(cache_path, allow_pickle=False)
        schema = str(cache["feature_schema"])
        if schema != FEATURE_SCHEMA_VERSION:
            raise ValueError(
                f"Landmark auxiliary cache uses {schema}; "
                f"expected {FEATURE_SCHEMA_VERSION}."
            )
        return {
            "x": cache["x"],
            "x_mirrored": cache["x_mirrored"],
            "y": cache["y"],
            "total": int(cache["total"]),
            "failed": [json.loads(str(item)) for item in cache["failed"]],
        }

    features, mirrored, labels, failed = [], [], [], []
    labels_expected = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    for label in labels_expected:
        label_root = data_path / label
        if not label_root.is_dir():
            raise ValueError(f"Landmark dataset is missing class {label}: {label_root}")
        for sequence_root in sorted(
            (path for path in label_root.iterdir() if path.is_dir()),
            key=lambda path: (
                0,
                int(path.name),
            )
            if path.name.isdigit()
            else (1, path.name),
        ):
            frame_path = sequence_root / f"{frame_index}.npy"
            try:
                raw = np.load(frame_path, allow_pickle=False).reshape(2, 21, 3)
            except (OSError, ValueError) as error:
                failed.append(
                    {"path": str(frame_path), "label": label, "reason": str(error)}
                )
                continue
            observation = FrameObservation(
                tuple(
                    HandObservation(handedness="", points=points)
                    for points in raw
                    if np.any(points)
                )
            )
            if not observation.hands:
                failed.append(
                    {"path": str(frame_path), "label": label, "reason": "no_hands"}
                )
                continue
            features.append(build_features(observation, mode="geometry"))
            mirrored.append(build_features(observation, mode="geometry", mirror=True))
            labels.append(label)

    result = {
        "x": np.asarray(features, dtype=np.float64),
        "x_mirrored": np.asarray(mirrored, dtype=np.float64),
        "y": np.asarray(labels),
        "total": len(features) + len(failed),
        "failed": failed,
    }
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        cache_path,
        feature_schema=np.asarray(FEATURE_SCHEMA_VERSION),
        x=result["x"],
        x_mirrored=result["x_mirrored"],
        y=result["y"],
        total=np.asarray(result["total"]),
        failed=np.asarray([json.dumps(item) for item in failed]),
    )
    return result


def _new_model(c_value, seed, probability=False):
    return Pipeline(
        [
            ("scale", StandardScaler()),
            (
                "svc",
                SVC(
                    C=c_value,
                    kernel="rbf",
                    gamma="scale",
                    class_weight="balanced",
                    probability=probability,
                    cache_size=2048,
                    decision_function_shape="ovr",
                    random_state=seed,
                ),
            ),
        ]
    )


def _probabilities(model, split):
    return model.predict_proba(split["x"])


def _metrics(model, split, rejection=None):
    started = time.perf_counter()
    probabilities = _probabilities(model, split)
    elapsed = time.perf_counter() - started
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    predictions = model.classes_[order[:, 0]]
    correct = predictions == split["y"]
    result = {
        "detected_samples": int(len(split["y"])),
        "source_samples": int(split["total"]),
        "hand_detection_rate": float(len(split["y"]) / split["total"]),
        "accuracy_on_detected": float(accuracy_score(split["y"], predictions)),
        "end_to_end_accuracy": float(correct.sum() / split["total"]),
        "macro_f1_on_detected": float(
            f1_score(split["y"], predictions, average="macro")
        ),
        "latency_ms_per_sample": float(elapsed / len(split["y"]) * 1000),
        "mean_correct_confidence": float(probabilities.max(axis=1)[correct].mean()),
        "mean_incorrect_confidence": float(
            probabilities.max(axis=1)[~correct].mean() if (~correct).any() else 0.0
        ),
        "classification_report": classification_report(
            split["y"], predictions, output_dict=True, zero_division=0
        ),
        "failed_hand_detection_by_class": dict(
            Counter(item["label"] for item in split["failed"])
        ),
    }
    if rejection:
        top1 = probabilities[np.arange(len(probabilities)), order[:, 0]]
        top2 = probabilities[np.arange(len(probabilities)), order[:, 1]]
        accepted = (top1 >= rejection["min_confidence"]) & (
            (top1 - top2) >= rejection["min_margin"]
        )
        result["rejection"] = {
            **rejection,
            "accepted_samples": int(accepted.sum()),
            "coverage_on_detected": float(accepted.mean()),
            "accepted_accuracy": float(correct[accepted].mean())
            if accepted.any()
            else 0.0,
            "accepted_end_to_end_rate": float(accepted.sum() / split["total"]),
        }
    return result


def _select_rejection_thresholds(model, split):
    probabilities = _probabilities(model, split)
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    top1 = probabilities[np.arange(len(probabilities)), order[:, 0]]
    top2 = probabilities[np.arange(len(probabilities)), order[:, 1]]
    predicted = model.classes_[order[:, 0]]
    correct = predicted == split["y"]
    candidates = []
    for confidence in np.arange(0.50, 0.981, 0.01):
        for margin in np.arange(0.02, 0.41, 0.02):
            accepted = (top1 >= confidence) & ((top1 - top2) >= margin)
            count = int(accepted.sum())
            if not count:
                continue
            candidates.append(
                {
                    "min_confidence": round(float(confidence), 2),
                    "min_margin": round(float(margin), 2),
                    "coverage": float(count / len(accepted)),
                    "accepted_accuracy": float(correct[accepted].mean()),
                    "accepted_samples": count,
                }
            )

    eligible = [
        item
        for item in candidates
        if item["accepted_accuracy"] >= 0.99 and item["coverage"] >= 0.15
    ]
    if eligible:
        selected = max(eligible, key=lambda item: item["coverage"])
    else:
        selected = max(
            candidates,
            key=lambda item: item["accepted_accuracy"] * item["coverage"],
        )
    return selected, candidates


def _augmented(*splits):
    x = np.concatenate(
        [value for split in splits for value in (split["x"], split["x_mirrored"])],
        axis=0,
    )
    y = np.concatenate([split["y"] for split in splits for _ in range(2)], axis=0)
    return x, y


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data",
        type=Path,
        default=Path(
            "data/raw/mendeley_bisindo_v1/BISINDO DATASET/Mendeley BISINDO"
        ),
    )
    parser.add_argument(
        "--manifest", type=Path, default=Path("data/splits/mendeley_v1.json")
    )
    parser.add_argument(
        "--cache", type=Path, default=Path("data/cache/mendeley_geometry_v5.npz")
    )
    parser.add_argument(
        "--landmark-cache",
        type=Path,
        help="Optional earlier cache whose raw landmarks will be reused.",
    )
    parser.add_argument(
        "--aux-data",
        type=Path,
        help="Optional additional A-Z dataset used for training only.",
    )
    parser.add_argument(
        "--aux-cache",
        type=Path,
        default=Path("data/cache/kaggle_geometry_v5.npz"),
    )
    parser.add_argument(
        "--landmark-aux-data",
        type=Path,
        help="Optional A-Z/<sequence>/<frame>.npy MediaPipe dataset.",
    )
    parser.add_argument(
        "--landmark-aux-cache",
        type=Path,
        default=Path("data/cache/talkee_geometry_v5.npz"),
    )
    parser.add_argument("--landmark-frame-index", type=int, default=15)
    parser.add_argument(
        "--output", type=Path, default=Path("models/bisindo_geometry_v5.pkl")
    )
    parser.add_argument("--report", type=Path, default=Path("reports/production_v5.json"))
    parser.add_argument("--rebuild-cache", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    manifest = (
        load_manifest(args.manifest)
        if args.manifest.exists()
        else create_group_split_manifest(args.data, args.manifest)
    )
    if args.landmark_cache:
        splits = _rebuild_from_landmark_cache(args.landmark_cache, args.cache)
    else:
        splits = _load_or_build_features(manifest, args.cache, args.rebuild_cache)
    x_train, y_train = _augmented(splits["train"])
    auxiliary = None
    if args.aux_data:
        auxiliary = _load_or_build_auxiliary(
            args.aux_data, args.aux_cache, args.rebuild_cache
        )
        x_train = np.concatenate(
            (x_train, auxiliary["x"], auxiliary["x_mirrored"]), axis=0
        )
        y_train = np.concatenate(
            (y_train, auxiliary["y"], auxiliary["y"]), axis=0
        )
    landmark_auxiliary = None
    if args.landmark_aux_data:
        landmark_auxiliary = _load_or_build_landmark_auxiliary(
            args.landmark_aux_data,
            args.landmark_aux_cache,
            args.landmark_frame_index,
            args.rebuild_cache,
        )
        x_train = np.concatenate(
            (
                x_train,
                landmark_auxiliary["x"],
                landmark_auxiliary["x_mirrored"],
            ),
            axis=0,
        )
        y_train = np.concatenate(
            (y_train, landmark_auxiliary["y"], landmark_auxiliary["y"]),
            axis=0,
        )

    candidate_results = {}
    for c_value in (0.3, 1.0, 3.0):
        model = _new_model(c_value, args.seed)
        started = time.perf_counter()
        model.fit(x_train, y_train)
        predictions = model.predict(splits["val"]["x"])
        candidate_results[str(c_value)] = {
            "macro_f1": float(
                f1_score(splits["val"]["y"], predictions, average="macro")
            ),
            "accuracy": float(accuracy_score(splits["val"]["y"], predictions)),
            "fit_seconds": float(time.perf_counter() - started),
        }
        print(f"C={c_value}: {candidate_results[str(c_value)]}", flush=True)

    best_c = max(
        (0.3, 1.0, 3.0),
        key=lambda value: candidate_results[str(value)]["macro_f1"],
    )
    evaluation_model = _new_model(best_c, args.seed, probability=True)
    evaluation_model.fit(x_train, y_train)
    rejection, rejection_grid = _select_rejection_thresholds(
        evaluation_model, splits["val"]
    )
    validation_metrics = _metrics(evaluation_model, splits["val"], rejection)
    test_metrics = _metrics(evaluation_model, splits["test"], rejection)

    # Hyperparameters, calibration and the final unbiased test have now been
    # fixed. Refit on every available public participant for deployment.
    x_final, y_final = _augmented(splits["train"], splits["val"], splits["test"])
    if auxiliary:
        x_final = np.concatenate(
            (x_final, auxiliary["x"], auxiliary["x_mirrored"]), axis=0
        )
        y_final = np.concatenate(
            (y_final, auxiliary["y"], auxiliary["y"]), axis=0
        )
    if landmark_auxiliary:
        x_final = np.concatenate(
            (
                x_final,
                landmark_auxiliary["x"],
                landmark_auxiliary["x_mirrored"],
            ),
            axis=0,
        )
        y_final = np.concatenate(
            (
                y_final,
                landmark_auxiliary["y"],
                landmark_auxiliary["y"],
            ),
            axis=0,
        )
    final_model = _new_model(best_c, args.seed, probability=True)
    started = time.perf_counter()
    final_model.fit(x_final, y_final)
    final_fit_seconds = time.perf_counter() - started

    model_version = f"5.0.0-{date.today().isoformat()}"
    bundle = {
        "bundle_version": 2,
        "model_name": "rbf_svc_bisindo_geometry",
        "model_version": model_version,
        "feature_schema": FEATURE_SCHEMA_VERSION,
        "feature_count": GEOMETRY_FEATURE_COUNT,
        "classes": final_model.classes_.tolist(),
        "estimator": final_model,
        "rejection": rejection,
        "max_interacting_hand_gap": MAX_INTERACTING_HAND_GAP,
        "training_source": "Mendeley Data 10.17632/4xnkvr88tk.1 (CC BY 4.0)",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, args.output, compress=3)

    report = {
        "model_name": bundle["model_name"],
        "model_version": model_version,
        "training_date": date.today().isoformat(),
        "dataset": bundle["training_source"],
        "split_policy": manifest["split_policy"],
        "validation_group": manifest["validation_group"],
        "test_group": manifest["test_group"],
        "feature_schema": FEATURE_SCHEMA_VERSION,
        "feature_count": GEOMETRY_FEATURE_COUNT,
        "max_interacting_hand_gap": MAX_INTERACTING_HAND_GAP,
        "horizontal_mirror_augmentation": True,
        "training_detected_samples_before_mirroring": int(len(splits["train"]["y"])),
        "class_counts_train_before_mirroring": dict(Counter(splits["train"]["y"])),
        "candidate_validation": candidate_results,
        "selected_c": best_c,
        "probability_calibration": "SVC Platt scaling with deterministic 5-fold CV",
        "validation": validation_metrics,
        "test": test_metrics,
        "selected_rejection_threshold": rejection,
        "rejection_threshold_grid": rejection_grid,
        "production_refit": {
            "policy": "all public participants after evaluation was frozen",
            "detected_samples_before_mirroring": int(
                sum(len(splits[name]["y"]) for name in ("train", "val", "test"))
                + (len(auxiliary["y"]) if auxiliary else 0)
                + (len(landmark_auxiliary["y"]) if landmark_auxiliary else 0)
            ),
            "samples_after_mirroring": int(len(y_final)),
            "fit_seconds": final_fit_seconds,
            "not_independently_evaluated": True,
        },
        "auxiliary_dataset": {
            "source": "achmadnoer/alfabet-bisindo (CC0 Public Domain)",
            "source_samples": auxiliary["total"],
            "detected_samples": int(len(auxiliary["y"])),
        }
        if auxiliary
        else None,
        "landmark_auxiliary_dataset": {
            "source": "niputukarismadewi/talkee-bisindo-sign-language-dataset (CC0)",
            "sampling": f"one middle frame ({args.landmark_frame_index}) per sequence",
            "source_samples": landmark_auxiliary["total"],
            "detected_samples": int(len(landmark_auxiliary["y"])),
        }
        if landmark_auxiliary
        else None,
        "model_path": str(args.output),
        "model_size_bytes": args.output.stat().st_size,
        "model_sha256": _sha256(args.output),
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "model": str(args.output),
                "selected_c": best_c,
                "validation": validation_metrics,
                "test": test_metrics,
                "production_refit": report["production_refit"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
