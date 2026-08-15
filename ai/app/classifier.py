from __future__ import annotations

import threading
import warnings
from dataclasses import dataclass
from pathlib import Path

import cv2
import joblib
import numpy as np

from .landmarks import (
    FEATURE_SCHEMA_VERSION,
    GEOMETRY_FEATURE_COUNT,
    LEGACY_FEATURE_COUNT,
    HandLandmarkExtractor,
    build_features,
)


ALPHABET = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


@dataclass(frozen=True)
class Prediction:
    detected: bool
    accepted: bool = False
    label: str | None = None
    confidence: float = 0.0
    hands_detected: int = 0
    relevant_hands: int = 0
    hand_span: float = 0.0
    probabilities: dict[str, float] | None = None
    second_label: str | None = None
    margin: float = 0.0
    rejection_reason: str | None = None


class BisindoClassifier:
    """Stateless-per-frame, thread-safe MediaPipe + BISINDO inference."""

    def __init__(
        self,
        model_path: Path,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        feature_mode: str = "geometry",
        min_hand_span: float = 0.06,
    ) -> None:
        if not model_path.is_file():
            raise FileNotFoundError(f"BISINDO model not found: {model_path}")

        artifact = joblib.load(model_path)
        if isinstance(artifact, dict) and "estimator" in artifact:
            self._bundle = artifact
            self._model = artifact["estimator"]
            self._feature_mode = "geometry"
            expected_features = int(artifact.get("feature_count", -1))
            if artifact.get("feature_schema") != FEATURE_SCHEMA_VERSION:
                raise ValueError(
                    "Model feature schema does not match runtime: "
                    f"{artifact.get('feature_schema')} != {FEATURE_SCHEMA_VERSION}."
                )
            if expected_features != GEOMETRY_FEATURE_COUNT:
                raise ValueError(
                    f"Model expects {expected_features} geometry features; "
                    f"runtime builds {GEOMETRY_FEATURE_COUNT}."
                )
            self._rejection = artifact.get("rejection", {})
            self.model_name = str(artifact.get("model_name", "bisindo"))
            self.model_version = str(artifact.get("model_version", "unknown"))
            self.feature_schema = str(artifact["feature_schema"])
        else:
            # Kept only as an explicit rollback path for the original model.
            self._bundle = None
            self._model = artifact
            self._feature_mode = feature_mode
            self._rejection = {"min_confidence": 0.0, "min_margin": 0.0}
            self.model_name = model_path.stem
            self.model_version = "legacy"
            self.feature_schema = feature_mode
            expected_features = LEGACY_FEATURE_COUNT

        model_feature_count = getattr(self._model, "n_features_in_", expected_features)
        if model_feature_count != expected_features:
            raise ValueError(
                f"Model expects {model_feature_count} features; "
                f"artifact declares {expected_features}."
            )
        classes = tuple(str(label) for label in self._model.classes_)
        if classes != ALPHABET:
            raise ValueError(f"BISINDO model must contain exactly A-Z; got {classes}.")

        # REST requests do not identify a persistent camera session. Static
        # mode prevents MediaPipe tracking state leaking between users.
        self._extractor = HandLandmarkExtractor(
            static_image_mode=True,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self._lock = threading.Lock()
        self._min_hand_span = min_hand_span

    @property
    def model_info(self) -> dict:
        return {
            "name": self.model_name,
            "version": self.model_version,
            "featureSchema": self.feature_schema,
            "classes": len(self._model.classes_),
            "rejection": self._rejection,
        }

    def predict(self, image_bytes: bytes) -> Prediction:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Image could not be decoded.")

        with self._lock:
            observation = self._extractor.observe(image)
            if observation is None:
                return Prediction(detected=False, rejection_reason="no_hands")

            hands_detected = observation.hands_detected
            relevant_hands = len(observation.relevant_hands)
            hand_span = observation.hand_span
            if hand_span < self._min_hand_span:
                return Prediction(
                    detected=True,
                    hands_detected=hands_detected,
                    relevant_hands=relevant_hands,
                    hand_span=hand_span,
                    rejection_reason="hand_too_small",
                )

            features = build_features(observation, mode=self._feature_mode).reshape(1, -1)
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore", message="X does not have valid feature names"
                )
                probabilities = self._model.predict_proba(features)[0]

        ranked_indices = np.argsort(probabilities)[::-1]
        best_index = int(ranked_indices[0])
        second_index = int(ranked_indices[1])
        confidence = float(probabilities[best_index])
        margin = float(probabilities[best_index] - probabilities[second_index])
        min_confidence = float(self._rejection.get("min_confidence", 0.0))
        min_margin = float(self._rejection.get("min_margin", 0.0))
        accepted = confidence >= min_confidence and margin >= min_margin
        rejection_reason = None
        if not accepted:
            rejection_reason = (
                "low_confidence" if confidence < min_confidence else "low_margin"
            )

        return Prediction(
            detected=True,
            accepted=accepted,
            label=str(self._model.classes_[best_index]),
            confidence=confidence,
            hands_detected=hands_detected,
            relevant_hands=relevant_hands,
            hand_span=hand_span,
            probabilities={
                str(label): float(probability)
                for label, probability in zip(self._model.classes_, probabilities)
            },
            second_label=str(self._model.classes_[second_index]),
            margin=margin,
            rejection_reason=rejection_reason,
        )

    def close(self) -> None:
        self._extractor.close()
