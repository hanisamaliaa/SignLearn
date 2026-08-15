from __future__ import annotations

from dataclasses import dataclass

import cv2
import mediapipe as mp
import numpy as np


LANDMARKS_PER_HAND = 21
MAX_HANDS = 2
COORDINATES = 3
LEGACY_FEATURE_COUNT = MAX_HANDS * LANDMARKS_PER_HAND * COORDINATES

# Geometry v4 keeps each hand's shape in a wrist-centred coordinate system and
# explicitly describes finger articulation and two-hand contact.  Cross-hand
# distances are important for BISINDO letters that differ by which finger or
# palm area is touched.  The last three values are two presence masks and a
# normalised hand count.
LOCAL_FEATURE_COUNT = LEGACY_FEATURE_COUNT
HAND_CONNECTIONS = tuple(sorted(mp.solutions.hands.HAND_CONNECTIONS))
BONE_FEATURE_COUNT = MAX_HANDS * len(HAND_CONNECTIONS) * COORDINATES
INTRA_DISTANCE_COUNT_PER_HAND = LANDMARKS_PER_HAND * (LANDMARKS_PER_HAND - 1) // 2
INTRA_DISTANCE_FEATURE_COUNT = MAX_HANDS * INTRA_DISTANCE_COUNT_PER_HAND
CROSS_DISTANCE_FEATURE_COUNT = LANDMARKS_PER_HAND * LANDMARKS_PER_HAND
PAIR_FEATURE_COUNT = LANDMARKS_PER_HAND * COORDINATES
GEOMETRY_FEATURE_COUNT = (
    LOCAL_FEATURE_COUNT
    + BONE_FEATURE_COUNT
    + INTRA_DISTANCE_FEATURE_COUNT
    + CROSS_DISTANCE_FEATURE_COUNT
    + PAIR_FEATURE_COUNT
    + MAX_HANDS
    + 1
)
FEATURE_SCHEMA_VERSION = "bisindo-geometry-v5"
MAX_INTERACTING_HAND_GAP = 1.5


@dataclass(frozen=True)
class HandObservation:
    handedness: str
    points: np.ndarray


@dataclass(frozen=True)
class FrameObservation:
    hands: tuple[HandObservation, ...]

    @property
    def hands_detected(self) -> int:
        return len(self.hands)

    @property
    def hand_span(self) -> float:
        """Largest detected-hand span as a fraction of the input frame."""
        if not self.hands:
            return 0.0
        return max(
            float(np.ptp(hand.points[:, :2], axis=0).max()) for hand in self.hands
        )

    @property
    def relevant_hands(self) -> tuple[HandObservation, ...]:
        """Discard a distant passive hand from an otherwise one-hand sign.

        MediaPipe can see a user's resting hand at the bottom of the frame.  It
        should only be part of a two-hand sign when it is close enough to
        interact with the active hand.  When hands are far apart, the upper
        hand is normally the one intentionally presented to the camera.
        """
        if len(self.hands) < MAX_HANDS:
            return self.hands

        first, second = self.hands[:MAX_HANDS]
        mean_scale = (_palm_scale(first.points) + _palm_scale(second.points)) / 2.0
        gap = np.linalg.norm(
            (
                first.points[:, None, :2]
                - second.points[None, :, :2]
            ),
            axis=2,
        ).min() / max(mean_scale, 1e-6)
        if gap <= MAX_INTERACTING_HAND_GAP:
            return self.hands[:MAX_HANDS]

        active = min(
            (first, second),
            key=lambda hand: float(hand.points[:, 1].mean()),
        )
        return (active,)


def _palm_scale(points: np.ndarray) -> float:
    wrist_to_middle_mcp = np.linalg.norm(points[9] - points[0])
    palm_width = np.linalg.norm(points[17] - points[5])
    return max(float((wrist_to_middle_mcp + palm_width) / 2.0), 1e-6)


def observation_tensor(
    observation: FrameObservation,
    mirror: bool = False,
    prune_irrelevant: bool = True,
) -> tuple[np.ndarray, np.ndarray]:
    """Return screen-ordered absolute landmarks plus hand-presence masks."""
    hands = []
    source_hands = observation.relevant_hands if prune_irrelevant else observation.hands
    for hand in source_hands:
        points = hand.points.astype(np.float64, copy=True)
        if mirror:
            points[:, 0] = 1.0 - points[:, 0]
        hands.append(points)
    hands.sort(key=lambda points: float(points[0, 0]))

    slots = np.zeros(
        (MAX_HANDS, LANDMARKS_PER_HAND, COORDINATES), dtype=np.float64
    )
    masks = np.zeros(MAX_HANDS, dtype=np.float64)
    for index, points in enumerate(hands[:MAX_HANDS]):
        slots[index] = points
        masks[index] = 1.0
    return slots, masks


def _pairwise_distances(points: np.ndarray) -> np.ndarray:
    return np.linalg.norm(points[:, None, :] - points[None, :, :], axis=2)


def geometry_features(observation: FrameObservation, mirror: bool = False) -> np.ndarray:
    """Build translation/scale robust features without losing two-hand geometry.

    Hands are ordered from screen-left to screen-right.  Per-hand coordinates
    retain pose and orientation, while pair displacement retains the distance
    and interaction between both hands.  This fixes the previous normalisation,
    which normalised each hand independently and erased that interaction.
    """
    slots, masks = observation_tensor(observation, mirror=mirror)

    local_slots = np.zeros(
        (MAX_HANDS, LANDMARKS_PER_HAND, COORDINATES), dtype=np.float64
    )
    scales: list[float] = []
    bone_slots = np.zeros(
        (MAX_HANDS, len(HAND_CONNECTIONS), COORDINATES), dtype=np.float64
    )
    intra_slots = np.zeros(
        (MAX_HANDS, INTRA_DISTANCE_COUNT_PER_HAND), dtype=np.float64
    )
    upper_triangle = np.triu_indices(LANDMARKS_PER_HAND, k=1)
    for index, points in enumerate(slots):
        if not masks[index]:
            scales.append(1.0)
            continue
        scale = _palm_scale(points)
        local_slots[index] = (points - points[0]) / scale
        scales.append(scale)
        for connection_index, (start, end) in enumerate(HAND_CONNECTIONS):
            bone = points[end] - points[start]
            bone_slots[index, connection_index] = bone / max(
                float(np.linalg.norm(bone)), 1e-6
            )
        intra_slots[index] = _pairwise_distances(points)[upper_triangle] / scale

    pair = np.zeros((LANDMARKS_PER_HAND, COORDINATES), dtype=np.float64)
    cross_distances = np.zeros(
        (LANDMARKS_PER_HAND, LANDMARKS_PER_HAND), dtype=np.float64
    )
    if masks.all():
        pair_scale = max(float(np.mean(scales[:MAX_HANDS])), 1e-6)
        pair = (slots[1] - slots[0]) / pair_scale
        cross_distances = np.linalg.norm(
            slots[0][:, None, :] - slots[1][None, :, :], axis=2
        ) / pair_scale

    hand_count = np.asarray([masks.mean()], dtype=np.float64)
    return np.concatenate(
        (
            local_slots.ravel(),
            bone_slots.ravel(),
            intra_slots.ravel(),
            cross_distances.ravel(),
            pair.ravel(),
            masks,
            hand_count,
        )
    )


def legacy_features(observation: FrameObservation, normalized: bool = False) -> np.ndarray:
    hands = list(observation.hands)
    if normalized:
        hands.sort(key=lambda hand: (hand.handedness != "Left", hand.handedness))

    values: list[float] = []
    for hand in hands:
        points = hand.points.astype(np.float64, copy=True)
        if normalized:
            points -= points[0]
            scale = max(float(np.ptp(hand.points[:, :2], axis=0).max()), 1e-6)
            points /= scale
        values.extend(points.ravel().tolist())
    values.extend([0.0] * (LEGACY_FEATURE_COUNT - len(values)))
    return np.asarray(values[:LEGACY_FEATURE_COUNT], dtype=np.float64)


def build_features(
    observation: FrameObservation,
    mode: str = "geometry",
    mirror: bool = False,
) -> np.ndarray:
    if mode == "geometry":
        return geometry_features(observation, mirror=mirror)
    if mode == "normalized":
        return legacy_features(observation, normalized=True)
    if mode == "legacy":
        return legacy_features(observation, normalized=False)
    raise ValueError(f"Unsupported BISINDO feature mode: {mode}")


class HandLandmarkExtractor:
    """Owns one MediaPipe graph; callers must provide external locking."""

    def __init__(
        self,
        *,
        static_image_mode: bool = True,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_complexity: int = 1,
    ) -> None:
        self._hands = mp.solutions.hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=MAX_HANDS,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            model_complexity=model_complexity,
        )

    def observe(self, image: np.ndarray) -> FrameObservation | None:
        results = self._hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if not results.multi_hand_landmarks:
            return None

        handedness = results.multi_handedness or []
        observations = []
        for index, hand in enumerate(results.multi_hand_landmarks[:MAX_HANDS]):
            points = np.asarray(
                [[landmark.x, landmark.y, landmark.z] for landmark in hand.landmark],
                dtype=np.float64,
            )
            label = (
                handedness[index].classification[0].label
                if index < len(handedness)
                else ""
            )
            observations.append(HandObservation(handedness=label, points=points))
        return FrameObservation(tuple(observations))

    def close(self) -> None:
        self._hands.close()
