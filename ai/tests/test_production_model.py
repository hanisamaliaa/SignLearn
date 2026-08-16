from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path

import joblib
import numpy as np

from ai.app.landmarks import (
    FEATURE_SCHEMA_VERSION,
    GEOMETRY_FEATURE_COUNT,
    ONE_HANDED_LETTERS,
    TWO_HANDED_LETTERS,
    FrameObservation,
    HandObservation,
    build_features,
    expected_hand_count,
    to_isotropic,
)
from ai.training.corpora import Samples, hand_count_hygiene


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ai" / "models" / "bisindo_geometry_v6.pkl"
REPORT_PATH = ROOT / "ai" / "reports" / "production_v6.json"
ALPHABET = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def hand(center_x: float, center_y: float) -> HandObservation:
    points = np.zeros((21, 3), dtype=np.float64)
    points[:, 0] = center_x + np.linspace(-0.05, 0.05, 21)
    points[:, 1] = center_y + np.linspace(0.0, -0.12, 21)
    points[:, 2] = np.linspace(0.0, -0.03, 21)
    return HandObservation(handedness="", points=points)


def pixel_hand() -> np.ndarray:
    """A hand shape in pixel units, deliberately not symmetric in x and y."""
    rng = np.random.default_rng(7)
    points = np.zeros((21, 3), dtype=np.float64)
    points[:, 0] = 260.0 + rng.uniform(-90.0, 90.0, 21)
    points[:, 1] = 180.0 + rng.uniform(-140.0, 140.0, 21)
    return points


def as_frame(points: np.ndarray, width: int, height: int) -> FrameObservation:
    """Normalise pixel landmarks the way MediaPipe does, then correct aspect."""
    normalised = points.copy()
    normalised[:, 0] /= width
    normalised[:, 1] /= height
    isotropic = to_isotropic(normalised, height / width)
    return FrameObservation((HandObservation(handedness="", points=isotropic),))


class GeometryTests(unittest.TestCase):
    def test_features_have_fixed_finite_shape(self):
        features = build_features(FrameObservation((hand(0.5, 0.6),)))
        self.assertEqual(features.shape, (GEOMETRY_FEATURE_COUNT,))
        self.assertTrue(np.isfinite(features).all())

    def test_same_gesture_gives_same_features_on_any_aspect_ratio(self):
        """The bug that made a 4:3 corpus mismatch a 16:9 webcam.

        MediaPipe divides x by width and y by height, so an uncorrected 640x480
        frame stretches the hand relative to a 1280x720 one and every distance,
        angle and palm scale downstream disagrees.
        """
        points = pixel_hand()
        four_three = build_features(as_frame(points, 640, 480))
        sixteen_nine = build_features(as_frame(points, 1280, 720))
        square = build_features(as_frame(points, 900, 900))
        np.testing.assert_allclose(four_three, sixteen_nine, atol=1e-9)
        np.testing.assert_allclose(four_three, square, atol=1e-9)

    def test_uncorrected_aspect_would_have_changed_the_features(self):
        """Guards the guard: proves the test above is not vacuous."""
        points = pixel_hand()
        def uncorrected(width, height):
            raw = points.copy()
            raw[:, 0] /= width
            raw[:, 1] /= height
            return build_features(
                FrameObservation((HandObservation(handedness="", points=raw),))
            )
        self.assertFalse(
            np.allclose(uncorrected(640, 480), uncorrected(1280, 720), atol=1e-6)
        )

    def test_distant_lower_hand_is_pruned_as_passive(self):
        observation = FrameObservation((hand(0.5, 0.35), hand(0.5, 0.9)))
        self.assertEqual(observation.hands_detected, 2)
        self.assertEqual(len(observation.relevant_hands), 1)
        self.assertLess(float(observation.relevant_hands[0].points[:, 1].mean()), 0.5)

    def test_touching_hands_are_kept(self):
        observation = FrameObservation((hand(0.46, 0.5), hand(0.54, 0.5)))
        self.assertEqual(len(observation.relevant_hands), 2)


class HandCountTests(unittest.TestCase):
    def test_the_two_groups_partition_the_alphabet(self):
        self.assertEqual(ONE_HANDED_LETTERS | TWO_HANDED_LETTERS, set(ALPHABET))
        self.assertFalse(ONE_HANDED_LETTERS & TWO_HANDED_LETTERS)
        self.assertEqual(len(ONE_HANDED_LETTERS), 10)
        self.assertEqual(len(TWO_HANDED_LETTERS), 16)

    def test_expected_hand_count_matches_the_groups(self):
        self.assertEqual(expected_hand_count("C"), 1)
        self.assertEqual(expected_hand_count("p"), 2)

    def test_hygiene_drops_letters_recorded_with_the_wrong_hand_count(self):
        """A two-handed letter seen with one hand zeroes 504 cross-hand
        features while keeping its label, which is what poisoned P and S."""
        samples = Samples(
            slots=np.zeros((4, 2, 21, 3)),
            masks=np.asarray([[1.0, 1.0], [1.0, 0.0], [1.0, 0.0], [1.0, 1.0]]),
            labels=np.asarray(["P", "P", "C", "C"]),
            source="unit-test",
            attempted=4,
        )
        cleaned, dropped = hand_count_hygiene(samples)
        self.assertEqual(list(cleaned.labels), ["P", "C"])
        self.assertEqual(dropped, {"P": 1, "C": 1})


@unittest.skipUnless(MODEL_PATH.is_file(), "production bundle is not built yet")
class BundleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # joblib.load unpickles; this path only ever points at an artifact
        # produced by ai.training.train_production in this repository.
        cls.bundle = joblib.load(MODEL_PATH)

    def test_bundle_is_exactly_the_a_to_z_production_schema(self):
        self.assertEqual(self.bundle["feature_schema"], FEATURE_SCHEMA_VERSION)
        self.assertEqual(self.bundle["feature_count"], GEOMETRY_FEATURE_COUNT)
        self.assertEqual(self.bundle["classes"], list(ALPHABET))
        self.assertEqual(
            self.bundle["estimator"].n_features_in_, GEOMETRY_FEATURE_COUNT
        )

    def test_shipped_model_never_saw_its_own_evaluation_data(self):
        """v5 refitted on train+val+test before saving, so its published
        accuracy described a model that was never deployed."""
        self.assertFalse(self.bundle["refit_on_evaluation_data"])

    def test_acceptance_policy_is_present_and_sane(self):
        rejection = self.bundle["rejection"]
        self.assertGreater(rejection["min_confidence"], 0.0)
        self.assertLess(rejection["min_confidence"], 1.0)
        self.assertGreaterEqual(rejection["min_margin"], 0.0)


@unittest.skipUnless(
    MODEL_PATH.is_file() and REPORT_PATH.is_file(), "production artifacts missing"
)
class ProvenanceTests(unittest.TestCase):
    def test_report_describes_the_bundle_on_disk(self):
        report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
        digest = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
        self.assertEqual(
            digest,
            report["model_sha256"],
            "reports/production_v6.json describes a different artifact than the "
            "one in models/; retrain or restore them together",
        )

    def test_every_letter_clears_the_release_bar_on_held_out_data(self):
        report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
        webcam_like = report["metrics"]["test_talkee"]
        self.assertEqual(
            webcam_like["letters_below_0_90"],
            [],
            "a letter regressed below 0.90 recall in the webcam-like domain",
        )
        self.assertEqual(len(webcam_like["per_letter_recall"]), 26)


if __name__ == "__main__":
    unittest.main()
