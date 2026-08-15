from __future__ import annotations

import hashlib
import unittest
from pathlib import Path

import joblib
import numpy as np

from ai.app.landmarks import (
    FEATURE_SCHEMA_VERSION,
    GEOMETRY_FEATURE_COUNT,
    FrameObservation,
    HandObservation,
    build_features,
)


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ai" / "models" / "bisindo_geometry_v5.pkl"
MODEL_SHA256 = "6fac6ef36d6258c9f46ca3d4a5b11b5e061bfa4a1e8199e431e78b9ede6e7910"


def hand(center_x: float, center_y: float) -> HandObservation:
    points = np.zeros((21, 3), dtype=np.float64)
    points[:, 0] = center_x + np.linspace(-0.05, 0.05, 21)
    points[:, 1] = center_y + np.linspace(0.0, -0.12, 21)
    points[:, 2] = np.linspace(0.0, -0.03, 21)
    return HandObservation(handedness="", points=points)


class GeometryTests(unittest.TestCase):
    def test_features_have_fixed_finite_shape(self):
        features = build_features(FrameObservation((hand(0.5, 0.6),)))
        self.assertEqual(features.shape, (GEOMETRY_FEATURE_COUNT,))
        self.assertTrue(np.isfinite(features).all())

    def test_distant_lower_hand_is_pruned_as_passive(self):
        observation = FrameObservation((hand(0.5, 0.35), hand(0.5, 0.9)))
        self.assertEqual(observation.hands_detected, 2)
        self.assertEqual(len(observation.relevant_hands), 1)
        self.assertLess(float(observation.relevant_hands[0].points[:, 1].mean()), 0.5)

    def test_touching_hands_are_kept(self):
        observation = FrameObservation((hand(0.46, 0.5), hand(0.54, 0.5)))
        self.assertEqual(len(observation.relevant_hands), 2)


class BundleTests(unittest.TestCase):
    def test_bundle_is_exactly_the_a_to_z_production_schema(self):
        bundle = joblib.load(MODEL_PATH)
        self.assertEqual(bundle["feature_schema"], FEATURE_SCHEMA_VERSION)
        self.assertEqual(bundle["feature_count"], GEOMETRY_FEATURE_COUNT)
        self.assertEqual(bundle["classes"], list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
        self.assertEqual(bundle["estimator"].n_features_in_, GEOMETRY_FEATURE_COUNT)
        self.assertEqual(bundle["rejection"]["min_confidence"], 0.93)

    def test_checked_in_bundle_checksum(self):
        digest = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
        self.assertEqual(digest, MODEL_SHA256)


if __name__ == "__main__":
    unittest.main()
