from __future__ import annotations

import threading
import warnings
from dataclasses import dataclass
from pathlib import Path

import cv2
import joblib
import mediapipe as mp
import numpy as np


FEATURE_COUNT = 2 * 21 * 3


@dataclass(frozen=True)
class Prediction:
    detected: bool
    label: str | None = None
    confidence: float = 0.0
    hands_detected: int = 0
    probabilities: dict[str, float] | None = None
    second_label: str | None = None
    margin: float = 0.0


class BisindoClassifier:
    """Thread-safe MediaPipe landmark extraction and BISINDO inference."""

    def __init__(
        self,
        model_path: Path,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        feature_mode: str = "legacy",
    ) -> None:
        if not model_path.is_file():
            raise FileNotFoundError(f"BISINDO model not found: {model_path}")

        self._model = joblib.load(model_path)
        model_feature_count = getattr(self._model, "n_features_in_", FEATURE_COUNT)
        if model_feature_count != FEATURE_COUNT:
            raise ValueError(
                f"Model expects {model_feature_count} features; expected {FEATURE_COUNT}."
            )

        self._hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self._lock = threading.Lock()
        self._feature_mode = feature_mode

    def predict(self, image_bytes: bytes) -> Prediction:
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Image could not be decoded.")

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # MediaPipe Hands keeps tracking state and is not thread-safe. One lock
        # protects both landmark extraction and the model call.
        with self._lock:
            results = self._hands.process(image_rgb)
            if not results.multi_hand_landmarks:
                return Prediction(detected=False)

            detected_hands = []
            handedness = results.multi_handedness or []
            for index, hand_landmarks in enumerate(results.multi_hand_landmarks[:2]):
                points = np.asarray(
                    [[landmark.x, landmark.y, landmark.z] for landmark in hand_landmarks.landmark],
                    dtype=np.float64,
                )
                label = handedness[index].classification[0].label if index < len(handedness) else ""
                detected_hands.append((label, points))

            if self._feature_mode == "normalized":
                detected_hands.sort(key=lambda item: (item[0] != "Left", item[0]))

            features: list[float] = []
            for _, points in detected_hands:
                if self._feature_mode == "normalized":
                    centered = points - points[0]
                    scale = max(float(np.ptp(points[:, :2], axis=0).max()), 1e-6)
                    points = centered / scale
                features.extend(points.reshape(-1).tolist())

            hands_detected = min(len(results.multi_hand_landmarks), 2)
            features.extend([0.0] * (FEATURE_COUNT - len(features)))
            model_input = np.asarray(features[:FEATURE_COUNT], dtype=np.float64).reshape(
                1, -1
            )

            # The original model was trained from a DataFrame and stores column
            # names, while realtime inference is positional. The feature order
            # remains the same, so suppress only that harmless sklearn warning.
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore", message="X does not have valid feature names"
                )
                probabilities = self._model.predict_proba(model_input)[0]

            best_index = int(np.argmax(probabilities))
            ranked_indices = np.argsort(probabilities)[::-1]
            second_index = int(ranked_indices[1])
            probability_map = {
                str(label): float(probability)
                for label, probability in zip(self._model.classes_, probabilities)
            }
            return Prediction(
                detected=True,
                label=str(self._model.classes_[best_index]),
                confidence=float(probabilities[best_index]),
                hands_detected=hands_detected,
                probabilities=probability_map,
                second_label=str(self._model.classes_[second_index]),
                margin=float(probabilities[best_index] - probabilities[second_index]),
            )

    def close(self) -> None:
        self._hands.close()
