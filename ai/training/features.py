from __future__ import annotations

from dataclasses import dataclass

import cv2
import mediapipe as mp
import numpy as np


FEATURE_COUNT = 126


@dataclass
class HandFeatureExtractor:
    static_image_mode: bool = True
    min_detection_confidence: float = 0.5

    def __post_init__(self) -> None:
        self._hands = mp.solutions.hands.Hands(
            static_image_mode=self.static_image_mode,
            max_num_hands=2,
            min_detection_confidence=self.min_detection_confidence,
            min_tracking_confidence=0.5,
        )

    def extract(self, image: np.ndarray, normalized: bool = True) -> np.ndarray | None:
        results = self._hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if not results.multi_hand_landmarks:
            return None

        detected = []
        handedness = results.multi_handedness or []
        for index, hand in enumerate(results.multi_hand_landmarks[:2]):
            points = np.asarray(
                [[landmark.x, landmark.y, landmark.z] for landmark in hand.landmark],
                dtype=np.float64,
            )
            label = handedness[index].classification[0].label if index < len(handedness) else ""
            detected.append((label, points))

        # Stable left/right order prevents MediaPipe detection order from becoming
        # an accidental model feature. Empty slots remain all-zero.
        if normalized:
            detected.sort(key=lambda item: (item[0] != "Left", item[0]))
        features = []
        for _, points in detected:
            if normalized:
                origin = points[0].copy()
                centered = points - origin
                xy_span = np.ptp(points[:, :2], axis=0)
                scale = max(float(xy_span.max()), 1e-6)
                points = centered / scale
            features.extend(points.reshape(-1).tolist())

        features.extend([0.0] * (FEATURE_COUNT - len(features)))
        return np.asarray(features[:FEATURE_COUNT], dtype=np.float64)

    def close(self) -> None:
        self._hands.close()
