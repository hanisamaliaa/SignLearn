"""Score a production bundle per letter on held-out data or real webcam frames.

Reports recall for all 26 letters rather than one headline accuracy, because a
model can look strong overall while a handful of letters are unusable -- which
is exactly how the v5 artifact shipped with P and S at zero recall.

    python -m ai.training.evaluate_model                    # held-out test sets
    python -m ai.training.evaluate_model --real-world       # your webcam set
    python -m ai.training.evaluate_model --min-recall 0.9   # fail below target
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score

from ai.app.landmarks import FEATURE_SCHEMA_VERSION, build_features
from .corpora import (
    ALPHABET,
    Samples,
    hand_count_hygiene,
    load_kaggle,
    load_mendeley,
    load_real_world,
    load_talkee,
)


def featurise(samples: Samples) -> np.ndarray:
    return np.asarray(
        [
            build_features(observation, mode="geometry")
            for observation in samples.observations()
        ]
    )


def score(model, samples: Samples, policy: dict) -> dict:
    features = featurise(samples)
    probabilities = model.predict_proba(features)
    order = np.argsort(probabilities, axis=1)[:, ::-1]
    rows = np.arange(len(probabilities))
    predictions = model.classes_[order[:, 0]]
    correct = predictions == samples.labels
    top1 = probabilities[rows, order[:, 0]]
    top2 = probabilities[rows, order[:, 1]]
    accepted = (top1 >= policy.get("min_confidence", 0.0)) & (
        (top1 - top2) >= policy.get("min_margin", 0.0)
    )
    present = [letter for letter in ALPHABET if (samples.labels == letter).any()]
    matrix = confusion_matrix(samples.labels, predictions, labels=list(ALPHABET))
    recall, coverage, confusions = {}, {}, {}
    for index, letter in enumerate(ALPHABET):
        support = matrix[index].sum()
        if not support:
            continue
        recall[letter] = float(matrix[index, index] / support)
        mask = samples.labels == letter
        coverage[letter] = float(accepted[mask].mean())
        wrong = {
            ALPHABET[j]: int(value)
            for j, value in enumerate(matrix[index])
            if value and j != index
        }
        if wrong:
            confusions[letter] = dict(
                sorted(wrong.items(), key=lambda item: -item[1])[:3]
            )
    return {
        "samples": int(len(samples)),
        "letters_present": len(present),
        "accuracy": float(accuracy_score(samples.labels, predictions)),
        "macro_f1": float(
            f1_score(samples.labels, predictions, labels=present, average="macro")
        ),
        "accepted_accuracy": float(correct[accepted].mean()) if accepted.any() else 0.0,
        "coverage": float(accepted.mean()),
        "recall": recall,
        "letter_coverage": coverage,
        "confusions": confusions,
    }


def render(name: str, result: dict, min_recall: float) -> list[str]:
    failing = sorted(
        letter for letter, value in result["recall"].items() if value < min_recall
    )
    print(f"\n=== {name}  n={result['samples']}  "
          f"accuracy={result['accuracy']:.4f}  macroF1={result['macro_f1']:.4f}")
    print(f"    accepted accuracy={result['accepted_accuracy']:.4f}  "
          f"coverage={result['coverage']:.4f}")
    for row in range(0, 26, 13):
        letters = ALPHABET[row:row + 13]
        shown = [letter for letter in letters if letter in result["recall"]]
        print("    " + "  ".join(f"{letter} {result['recall'][letter]:.2f}" for letter in shown))
    if result["confusions"]:
        worst = sorted(
            result["confusions"].items(), key=lambda item: result["recall"][item[0]]
        )[:6]
        print("    top confusions: " + "; ".join(
            f"{letter}->{'/'.join(f'{k}x{v}' for k, v in wrong.items())}"
            for letter, wrong in worst
        ))
    if failing:
        print(f"    BELOW {min_recall:.2f}: {', '.join(failing)}")
    else:
        print(f"    all letters at or above {min_recall:.2f}")
    return failing


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=Path("ai/models/bisindo_geometry_v6.pkl"))
    parser.add_argument("--talkee", type=Path, default=Path("ai/data/raw/talkee_bisindo/dt-final-100seq"))
    parser.add_argument("--kaggle", type=Path, default=Path("ai/data/raw/Citra BISINDO"))
    parser.add_argument(
        "--mendeley",
        type=Path,
        default=Path("ai/data/raw/mendeley_bisindo_v1/BISINDO DATASET/Mendeley BISINDO"),
    )
    parser.add_argument("--real-world-dir", type=Path, default=Path("ai/data/real_world"))
    parser.add_argument("--real-world", action="store_true", help="score only the webcam set")
    parser.add_argument("--min-recall", type=float, default=0.90)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    # joblib.load unpickles: only ever point --model at a bundle this repo
    # produced, never at a downloaded artifact.
    bundle = joblib.load(args.model)
    if bundle.get("feature_schema") != FEATURE_SCHEMA_VERSION:
        raise SystemExit(
            f"Bundle schema {bundle.get('feature_schema')} does not match runtime "
            f"{FEATURE_SCHEMA_VERSION}; features would not line up."
        )
    model = bundle["estimator"]
    policy = bundle.get("rejection", {})
    print(f"model {args.model} v{bundle.get('model_version')}  policy={policy}")

    if args.real_world:
        sources = {"real_world": load_real_world(args.real_world_dir)}
    else:
        sources = {
            "talkee (held-out sequences)": load_talkee(args.talkee, "test"),
            "kaggle (held-out images)": load_kaggle(args.kaggle, "test"),
            "mendeley (held-out signer group)": load_mendeley(args.mendeley, "test"),
        }
        real = load_real_world(args.real_world_dir)
        if len(real):
            sources["real_world (your webcam)"] = real

    results, failing = {}, {}
    for name, samples in sources.items():
        if not len(samples):
            print(f"\n=== {name}: no samples found; skipped")
            continue
        # Scored in full on purpose: frames where MediaPipe missed a hand still
        # reach the model in production, so excluding them would flatter the
        # report. The count is printed as a diagnostic instead.
        _, missed = hand_count_hygiene(samples)
        if missed:
            print(f"\n[{name}] {sum(missed.values())} of {len(samples)} frames carry a "
                  f"MediaPipe hand-detection miss (kept in the score): {missed}")
        results[name] = score(model, samples, policy)
        failing[name] = render(name, results[name], args.min_recall)

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"\nwritten {args.report}")

    if any(failing.values()):
        print("\nSome letters are below the required recall.")
        sys.exit(1)


if __name__ == "__main__":
    main()
