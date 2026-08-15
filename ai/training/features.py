from __future__ import annotations

import numpy as np

from ai.app.landmarks import (
    GEOMETRY_FEATURE_COUNT,
    HandLandmarkExtractor,
    build_features,
)


FEATURE_COUNT = GEOMETRY_FEATURE_COUNT


class HandFeatureExtractor:
    def __init__(
        self,
        static_image_mode: bool = True,
        min_detection_confidence: float = 0.5,
    ) -> None:
        self._extractor = HandLandmarkExtractor(
            static_image_mode=static_image_mode,
            min_detection_confidence=min_detection_confidence,
        )

    def extract(
        self,
        image: np.ndarray,
        normalized: bool | None = None,
        *,
        mode: str | None = None,
        mirror: bool = False,
    ) -> np.ndarray | None:
        observation = self._extractor.observe(image)
        if observation is None:
            return None
        if mode is None:
            mode = "normalized" if normalized is not False else "legacy"
        return build_features(observation, mode=mode, mirror=mirror)

    def close(self) -> None:
        self._extractor.close()
