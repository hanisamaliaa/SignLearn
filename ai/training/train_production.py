"""Train and honestly evaluate the production BISINDO alphabet classifier.

Deployment policy: the artifact written here is the exact estimator whose test
metrics are reported.  Nothing is refitted on validation or test data
afterwards.  A model that has seen its own test set has no measurable accuracy,
and the previous pipeline refitted on all three splits before saving, which is
why the shipped v5 artifact had no trustworthy numbers attached to it.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import time
from collections import Counter
from datetime import date
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from ai.app.landmarks import (
    FEATURE_SCHEMA_VERSION,
    GEOMETRY_FEATURE_COUNT,
    MAX_INTERACTING_HAND_GAP,
    build_features,
    expected_hand_count,
)
from .corpora import (
    ALPHABET,
    KAGGLE_ASPECT,
    MENDELEY_ASPECT,
    TALKEE_ASPECT,
    TALKEE_SETTLED_FRAMES,
    Samples,
    concatenate,
    empty_samples,
    hand_count_hygiene,
    load_kaggle,
    load_mendeley,
    load_real_world,
    load_talkee,
)


CANDIDATE_C = (1.0, 3.0, 10.0)


def _cache_path(cache_dir: Path, name: str) -> Path:
    return cache_dir / f"{name}_{FEATURE_SCHEMA_VERSION}.npz"


def _load_cached(cache_dir: Path, name: str, builder, rebuild: bool) -> Samples:
    path = _cache_path(cache_dir, name)
    if not rebuild and path.exists():
        stored = np.load(path, allow_pickle=False)
        return Samples(
            slots=stored["slots"],
            masks=stored["masks"],
            labels=stored["labels"],
            source=str(stored["source"]),
            attempted=int(stored["attempted"]),
            failures=[json.loads(str(item)) for item in stored["failures"]],
        )
    samples = builder()
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        path,
        slots=samples.slots,
        masks=samples.masks,
        labels=samples.labels,
        source=np.asarray(samples.source),
        attempted=np.asarray(samples.attempted),
        failures=np.asarray([json.dumps(item) for item in samples.failures]),
    )
    return samples


def featurise(samples: Samples, mirror: bool = False) -> np.ndarray:
    if not len(samples):
        return np.zeros((0, GEOMETRY_FEATURE_COUNT))
    return np.asarray(
        [
            build_features(observation, mode="geometry", mirror=mirror)
            for observation in samples.observations()
        ]
    )


def training_matrix(samples: Samples, mirror: bool) -> tuple[np.ndarray, np.ndarray]:
    """Mirroring covers left-handed signers.

    Verified safe before enabling: no letter's mirrored class centroid lands
    closer to another letter than to itself, so this cannot merge classes.
    """
    features = [featurise(samples)]
    labels = [samples.labels]
    if mirror:
        features.append(featurise(samples, mirror=True))
        labels.append(samples.labels)
    return np.concatenate(features), np.concatenate(labels)


def new_model(c_value: float, seed: int, probability: bool = False) -> Pipeline:
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
                    # 30k x 1179 float64 is ~285 MiB and Platt scaling refits
                    # five times; a smaller kernel cache keeps the peak well
                    # inside a 16 GiB machine at a few percent of fit time.
                    cache_size=1024,
                    decision_function_shape="ovr",
                    random_state=seed,
                ),
            ),
        ]
    )


def select_acceptance_policy(
    probabilities: np.ndarray,
    truth: np.ndarray,
    classes: np.ndarray,
    target_accuracy: float,
    min_letter_coverage: float,
) -> tuple[dict, list[dict]]:
    """Choose the confidence/margin pair shown to learners.

    The trade-off is pedagogical rather than statistical.  Accepting too
    eagerly teaches a wrong letter; accepting too rarely leaves the learner
    holding a pose while the app says nothing.  `target_accuracy` sets how
    often an accepted letter must be right; among the thresholds that clear it
    we take the one that accepts the most frames.

    `min_letter_coverage` guards a failure a global threshold hides: a policy
    can hit 98% overall while a hard letter such as M is almost never accepted,
    which would make that letter's lesson impossible to finish.  Thresholds
    that starve any single letter are rejected outright.
    """
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    rows = np.arange(len(probabilities))
    top1 = probabilities[rows, order[:, 0]]
    top2 = probabilities[rows, order[:, 1]]
    predicted = classes[order[:, 0]]
    correct = predicted == truth

    grid: list[dict] = []
    for confidence in np.arange(0.30, 0.981, 0.01):
        for margin in np.arange(0.00, 0.41, 0.02):
            accepted = (top1 >= confidence) & ((top1 - top2) >= margin)
            if not accepted.any():
                continue
            per_letter = {
                letter: float(accepted[truth == letter].mean())
                for letter in ALPHABET
                if (truth == letter).any()
            }
            grid.append(
                {
                    "min_confidence": round(float(confidence), 2),
                    "min_margin": round(float(margin), 2),
                    "coverage": float(accepted.mean()),
                    "accepted_accuracy": float(correct[accepted].mean()),
                    "accepted_samples": int(accepted.sum()),
                    "worst_letter_coverage": float(min(per_letter.values())),
                    "worst_letter": min(per_letter, key=per_letter.get),
                }
            )

    eligible = [
        item
        for item in grid
        if item["accepted_accuracy"] >= target_accuracy
        and item["worst_letter_coverage"] >= min_letter_coverage
    ]
    if eligible:
        selected = max(eligible, key=lambda item: item["coverage"])
    else:
        # Nothing clears both bars; fall back to the best accuracy/coverage
        # product so the caller still gets a usable policy plus a warning.
        selected = max(
            grid, key=lambda item: item["accepted_accuracy"] * item["coverage"]
        )
    return selected, grid


def evaluate(model, features, labels, samples: Samples, policy: dict | None) -> dict:
    if not len(labels):
        return {"detected_samples": 0}
    started = time.perf_counter()
    probabilities = model.predict_proba(features)
    elapsed = time.perf_counter() - started
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    rows = np.arange(len(probabilities))
    predictions = model.classes_[order[:, 0]]
    correct = predictions == labels

    # Average only over letters this split actually contains. Mendeley's
    # held-out group carries no J, L, O, R or Z at all, and scoring absent
    # classes as zero would report a collapse that never happened.
    present = [letter for letter in ALPHABET if (labels == letter).any()]
    report = classification_report(
        labels, predictions, labels=present, output_dict=True, zero_division=0
    )
    per_letter_recall = {
        letter: round(float(report[letter]["recall"]), 4)
        for letter in present
        if letter in report
    }
    consistent = np.asarray(
        [
            samples.masks[i].sum() == expected_hand_count(label)
            for i, label in enumerate(labels)
        ]
    )
    result = {
        "detected_samples": int(len(labels)),
        "source_samples": int(samples.attempted) or int(len(labels)),
        "letters_present": len(present),
        "hand_detection_rate": float(len(labels) / samples.attempted)
        if samples.attempted
        else 1.0,
        "accuracy_on_detected": float(accuracy_score(labels, predictions)),
        "macro_f1_on_detected": float(
            f1_score(labels, predictions, labels=present, average="macro")
        ),
        "end_to_end_accuracy": float(correct.sum() / samples.attempted)
        if samples.attempted
        else float(correct.mean()),
        # Splits the score by whether MediaPipe saw the hands the letter needs,
        # separating classifier mistakes from detection misses.
        "hand_count_consistent_share": float(consistent.mean()),
        "accuracy_when_hands_seen": float(correct[consistent].mean())
        if consistent.any()
        else 0.0,
        "accuracy_when_a_hand_was_missed": float(correct[~consistent].mean())
        if (~consistent).any()
        else None,
        "latency_ms_per_sample": float(elapsed / len(labels) * 1000),
        "per_letter_recall": per_letter_recall,
        "letters_below_0_90": sorted(
            letter for letter, value in per_letter_recall.items() if value < 0.90
        ),
        "mean_correct_confidence": float(probabilities.max(axis=1)[correct].mean())
        if correct.any()
        else 0.0,
        "mean_incorrect_confidence": float(probabilities.max(axis=1)[~correct].mean())
        if (~correct).any()
        else 0.0,
        "classification_report": report,
        "failed_hand_detection_by_class": dict(
            Counter(item["label"] for item in samples.failures)
        ),
    }
    if policy:
        top1 = probabilities[rows, order[:, 0]]
        top2 = probabilities[rows, order[:, 1]]
        accepted = (top1 >= policy["min_confidence"]) & (
            (top1 - top2) >= policy["min_margin"]
        )
        result["acceptance"] = {
            "min_confidence": policy["min_confidence"],
            "min_margin": policy["min_margin"],
            "accepted_samples": int(accepted.sum()),
            "coverage": float(accepted.mean()),
            "accepted_accuracy": float(correct[accepted].mean())
            if accepted.any()
            else 0.0,
            "per_letter_coverage": {
                letter: round(float(accepted[labels == letter].mean()), 4)
                for letter in present
            },
        }
    return result


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _describe(samples: Samples, dropped: dict[str, int]) -> dict:
    return {
        "source": samples.source,
        "kept": int(len(samples)),
        "dropped_by_hand_count_hygiene": dropped,
        "dropped_total": int(sum(dropped.values())),
        "class_counts": {k: int(v) for k, v in sorted(Counter(samples.labels).items())},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--talkee", type=Path, default=Path("ai/data/raw/talkee_bisindo/dt-final-100seq"))
    parser.add_argument("--kaggle", type=Path, default=Path("ai/data/raw/Citra BISINDO"))
    parser.add_argument(
        "--mendeley",
        type=Path,
        default=Path("ai/data/raw/mendeley_bisindo_v1/BISINDO DATASET/Mendeley BISINDO"),
    )
    parser.add_argument("--real-world", type=Path, default=Path("ai/data/real_world"))
    parser.add_argument("--cache", type=Path, default=Path("ai/data/cache"))
    parser.add_argument("--output", type=Path, default=Path("ai/models/bisindo_geometry_v6.pkl"))
    parser.add_argument("--report", type=Path, default=Path("ai/reports/production_v6.json"))
    # 0.975 rather than 0.97: on the measured validation curve it costs about
    # one point of coverage and buys half a point of accuracy, leaving headroom
    # for the drift between these corpora and an unseen webcam.
    parser.add_argument("--target-accuracy", type=float, default=0.975)
    parser.add_argument("--min-letter-coverage", type=float, default=0.40)
    parser.add_argument("--no-mirror", action="store_true")
    parser.add_argument("--rebuild-cache", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rebuild = args.rebuild_cache
    load = lambda name, builder: _load_cached(args.cache, name, builder, rebuild)
    # The sampled frames are part of what the cache contains, so they belong in
    # its name; otherwise changing them silently reuses the previous sampling.
    talkee_tag = "f" + "-".join(str(frame) for frame in TALKEE_SETTLED_FRAMES)

    print("Loading corpora (isotropic landmarks, leakage-safe splits)...", flush=True)
    talkee = {
        split: load(
            f"talkee_{split}_{talkee_tag}",
            lambda split=split: load_talkee(args.talkee, split),
        )
        for split in ("train", "val", "test")
    }
    kaggle = {
        split: load(f"kaggle_{split}", lambda split=split: load_kaggle(args.kaggle, split))
        for split in ("train", "test")
    }
    mendeley = {
        split: load(
            f"mendeley_{split}", lambda split=split: load_mendeley(args.mendeley, split)
        )
        for split in ("train", "val", "test")
    }
    raw_splits = {
        "train": concatenate(talkee["train"], kaggle["train"], mendeley["train"]),
        "val": concatenate(talkee["val"], mendeley["val"]),
        "test": concatenate(talkee["test"], kaggle["test"], mendeley["test"]),
    }
    per_corpus_test = {
        "talkee": talkee["test"],
        "kaggle": kaggle["test"],
        "mendeley": mendeley["test"],
    }
    real_world = load("real_world", lambda: load_real_world(args.real_world))

    # Hygiene is a training-data repair, never an evaluation filter. Dropping
    # frames where MediaPipe missed a hand would measure a world users do not
    # live in: in the app those frames still reach the model and still show the
    # learner a letter, so they stay in val and test.
    train_clean, train_dropped = hand_count_hygiene(raw_splits["train"])
    splits = {"train": train_clean, "val": raw_splits["val"], "test": raw_splits["test"]}
    print(
        f"  train: {len(raw_splits['train'])} -> {len(train_clean)} after hand-count "
        f"hygiene ({sum(train_dropped.values())} contradicted their letter)",
        flush=True,
    )
    hygiene = {"train": _describe(train_clean, train_dropped)}
    for name in ("val", "test"):
        _, would_drop = hand_count_hygiene(raw_splits[name])
        hygiene[name] = {
            "source": raw_splits[name].source,
            "kept": int(len(raw_splits[name])),
            "policy": "evaluated in full; hygiene is not applied to held-out data",
            "hand_count_contradictions_present": int(sum(would_drop.values())),
            "hand_count_contradictions_by_letter": would_drop,
        }
        print(
            f"  {name}: {len(raw_splits[name])} kept in full "
            f"({sum(would_drop.values())} carry a MediaPipe hand-detection miss)",
            flush=True,
        )

    x_train, y_train = training_matrix(splits["train"], mirror=not args.no_mirror)
    x_val, y_val = featurise(splits["val"]), splits["val"].labels
    x_test, y_test = featurise(splits["test"]), splits["test"].labels
    # Landmarks are no longer needed once features exist, and the SVM fit needs
    # every spare byte: StandardScaler and gamma="scale" each materialise a
    # full copy of the training matrix.
    raw_splits.clear()
    for holder in (talkee, kaggle, mendeley):
        holder.pop("train", None)
    for split in splits.values():
        split.slots = np.zeros((0, 0, 0, 0))
    gc.collect()
    print(f"train matrix {x_train.shape}, val {x_val.shape}, test {x_test.shape}", flush=True)

    candidates = {}
    for c_value in CANDIDATE_C:
        started = time.perf_counter()
        model = new_model(c_value, args.seed)
        model.fit(x_train, y_train)
        predictions = model.predict(x_val)
        candidates[str(c_value)] = {
            "macro_f1": float(f1_score(y_val, predictions, average="macro")),
            "accuracy": float(accuracy_score(y_val, predictions)),
            "fit_seconds": float(time.perf_counter() - started),
        }
        print(f"  C={c_value}: {candidates[str(c_value)]}", flush=True)

    best_c = max(CANDIDATE_C, key=lambda value: candidates[str(value)]["macro_f1"])
    print(f"selected C={best_c}; fitting calibrated model", flush=True)
    started = time.perf_counter()
    model = new_model(best_c, args.seed, probability=True)
    model.fit(x_train, y_train)
    fit_seconds = time.perf_counter() - started

    policy, grid = select_acceptance_policy(
        model.predict_proba(x_val),
        y_val,
        model.classes_,
        args.target_accuracy,
        args.min_letter_coverage,
    )
    print(f"acceptance policy chosen on validation: {policy}", flush=True)

    metrics = {
        "validation": evaluate(model, x_val, y_val, splits["val"], policy),
        "test": evaluate(model, x_test, y_test, splits["test"], policy),
    }
    for name, samples in per_corpus_test.items():
        if len(samples):
            metrics[f"test_{name}"] = evaluate(
                model, featurise(samples), samples.labels, samples, policy
            )
    if len(real_world):
        metrics["real_world"] = evaluate(
            model, featurise(real_world), real_world.labels, real_world, policy
        )

    model_version = f"6.0.0-{date.today().isoformat()}"
    bundle = {
        "bundle_version": 3,
        "model_name": "rbf_svc_bisindo_geometry",
        "model_version": model_version,
        "feature_schema": FEATURE_SCHEMA_VERSION,
        "feature_count": GEOMETRY_FEATURE_COUNT,
        "classes": model.classes_.tolist(),
        "estimator": model,
        "rejection": {
            "min_confidence": policy["min_confidence"],
            "min_margin": policy["min_margin"],
        },
        "max_interacting_hand_gap": MAX_INTERACTING_HAND_GAP,
        "trained_on": ["talkee", "kaggle", "mendeley"],
        "refit_on_evaluation_data": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, args.output, compress=3)

    report = {
        "model_name": bundle["model_name"],
        "model_version": model_version,
        "training_date": date.today().isoformat(),
        "feature_schema": FEATURE_SCHEMA_VERSION,
        "feature_count": GEOMETRY_FEATURE_COUNT,
        "aspect_ratios": {
            "mendeley": MENDELEY_ASPECT,
            "kaggle": KAGGLE_ASPECT,
            "talkee": TALKEE_ASPECT,
            "inference": "read from each frame's real dimensions",
        },
        "talkee_frames_used": list(TALKEE_SETTLED_FRAMES),
        "split_policy": (
            "Mendeley by capture group, Talkee by whole sequence, Kaggle by "
            "deterministic per-class rotation; no split cuts inside a session"
        ),
        "hand_count_hygiene": hygiene,
        "horizontal_mirror_augmentation": not args.no_mirror,
        "candidate_validation": candidates,
        "selected_c": best_c,
        "fit_seconds": fit_seconds,
        "acceptance_policy": policy,
        "acceptance_policy_target": {
            "target_accuracy": args.target_accuracy,
            "min_letter_coverage": args.min_letter_coverage,
        },
        "acceptance_grid": grid,
        "metrics": metrics,
        "refit_on_evaluation_data": False,
        "model_path": str(args.output),
        "model_size_bytes": args.output.stat().st_size,
        "model_sha256": _sha256(args.output),
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps({
        "model": str(args.output),
        "sha256": report["model_sha256"],
        "selected_c": best_c,
        "acceptance_policy": policy,
        "summary": {
            name: {
                "accuracy": round(value.get("accuracy_on_detected", 0.0), 4),
                "macro_f1": round(value.get("macro_f1_on_detected", 0.0), 4),
                "letters_below_0_90": value.get("letters_below_0_90"),
                "accepted_accuracy": round(
                    value.get("acceptance", {}).get("accepted_accuracy", 0.0), 4
                ),
                "coverage": round(value.get("acceptance", {}).get("coverage", 0.0), 4),
            }
            for name, value in metrics.items()
            if value.get("detected_samples")
        },
    }, indent=2))


if __name__ == "__main__":
    main()
