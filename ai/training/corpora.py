"""Loaders for every BISINDO corpus, with leakage-safe splits and hygiene.

Each corpus was captured with a different camera, so each declares its own
aspect ratio; landmarks are converted to isotropic units on load and are
directly comparable afterwards.

Splits never cut inside a recording session: Mendeley holds out whole capture
groups, Talkee holds out whole sequences, and Kaggle holds out whole images by
a deterministic per-class rotation.  Splitting any finer would put near
duplicate frames on both sides and inflate every reported number.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np

from ai.app.landmarks import (
    LANDMARKS_PER_HAND,
    MAX_HANDS,
    FrameObservation,
    HandLandmarkExtractor,
    HandObservation,
    expected_hand_count,
    to_isotropic,
)


ALPHABET = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}

# Mendeley footage is 640x480 and Kaggle images are square; both were measured
# directly from the files.  Talkee ships landmarks without the source frames,
# so its aspect was recovered from the data: the palm-width to index-length
# ratio is anatomically stable (~0.81 measured on square Kaggle images) and
# reads 0.66 in Talkee, and 16:9 is the value that maximises transfer from
# Talkee to both other corpora.  See ai/reports/ for the sweep.
MENDELEY_ASPECT = 480.0 / 640.0
KAGGLE_ASPECT = 1.0
TALKEE_ASPECT = 9.0 / 16.0

# Talkee sequences begin with the hand travelling into position.  Accuracy on
# held-out sequences climbs monotonically from 96.3% on frame 2 to 99.5% on
# frame 26, so only settled frames are used.
#
# Four frames rather than six: consecutive frames of a held pose are nearly
# duplicates, so the extra pair adds little signal while an RBF SVM costs
# roughly quadratic time and memory in sample count.
TALKEE_SETTLED_FRAMES = (14, 18, 22, 26)


@dataclass
class Samples:
    """Observations from one corpus split, before feature extraction."""

    slots: np.ndarray  # (n, MAX_HANDS, 21, 3) isotropic landmarks
    masks: np.ndarray  # (n, MAX_HANDS) hand presence
    labels: np.ndarray  # (n,) letters
    source: str
    attempted: int = 0
    failures: list[dict] = field(default_factory=list)

    def __len__(self) -> int:
        return len(self.labels)

    @property
    def hand_counts(self) -> np.ndarray:
        return self.masks.sum(axis=1).astype(int)

    def observations(self):
        for slot, mask in zip(self.slots, self.masks):
            yield FrameObservation(
                tuple(
                    HandObservation(handedness="", points=slot[index])
                    for index in range(MAX_HANDS)
                    if mask[index]
                )
            )

    def select(self, keep: np.ndarray) -> "Samples":
        return Samples(
            slots=self.slots[keep],
            masks=self.masks[keep],
            labels=self.labels[keep],
            source=self.source,
            attempted=self.attempted,
            failures=self.failures,
        )


def empty_samples(source: str) -> Samples:
    return Samples(
        slots=np.zeros((0, MAX_HANDS, LANDMARKS_PER_HAND, 3)),
        masks=np.zeros((0, MAX_HANDS)),
        labels=np.asarray([], dtype="<U1"),
        source=source,
    )


def _pack(hands: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    slots = np.zeros((MAX_HANDS, LANDMARKS_PER_HAND, 3), dtype=np.float64)
    masks = np.zeros(MAX_HANDS, dtype=np.float64)
    for index, points in enumerate(hands[:MAX_HANDS]):
        slots[index], masks[index] = points, 1.0
    return slots, masks


def hand_count_hygiene(samples: Samples) -> tuple[Samples, dict[str, int]]:
    """Drop samples whose hand count contradicts the letter.

    A two-handed letter recorded with one hand is a MediaPipe miss, not a
    variant spelling: it silently zeroes the 504 cross-hand features while
    keeping the label, which teaches the model that a bare hand is a valid P.
    Mendeley fails this check on 38% of its samples and Kaggle on 31%.
    """
    keep = np.asarray(
        [
            samples.masks[i].sum() == expected_hand_count(label)
            for i, label in enumerate(samples.labels)
        ]
    )
    dropped: dict[str, int] = {}
    for label in samples.labels[~keep]:
        dropped[str(label)] = dropped.get(str(label), 0) + 1
    return samples.select(keep), dropped


def _observe_images(
    records: list[dict], source: str, progress_every: int = 250
) -> Samples:
    """Run MediaPipe over image files.

    The extractor reads each frame's real dimensions and returns isotropic
    landmarks, so image corpora never need to declare an aspect ratio; only
    Talkee does, because it ships landmarks without the source frames.
    """
    extractor = HandLandmarkExtractor(static_image_mode=True)
    slots, masks, labels, failures = [], [], [], []
    try:
        for index, record in enumerate(records, start=1):
            image = cv2.imread(record["path"])
            if image is None:
                failures.append({**record, "reason": "decode_failed"})
                continue
            observation = extractor.observe(image)
            if observation is None:
                failures.append({**record, "reason": "no_hands"})
                continue
            slot, mask = _pack([hand.points for hand in observation.hands])
            slots.append(slot)
            masks.append(mask)
            labels.append(record["label"])
            if progress_every and index % progress_every == 0:
                print(
                    f"[{source}] {index}/{len(records)} images, {len(labels)} detected",
                    flush=True,
                )
    finally:
        extractor.close()
    return Samples(
        slots=np.asarray(slots) if slots else np.zeros((0, MAX_HANDS, LANDMARKS_PER_HAND, 3)),
        masks=np.asarray(masks) if masks else np.zeros((0, MAX_HANDS)),
        labels=np.asarray(labels),
        source=source,
        attempted=len(records),
        failures=failures,
    )


def _letter_images(root: Path) -> dict[str, list[Path]]:
    by_letter: dict[str, list[Path]] = {}
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        label = path.parent.name.upper()
        if len(label) == 1 and label.isalpha():
            by_letter.setdefault(label, []).append(path)
    return by_letter


# --------------------------------------------------------------------------
# Mendeley: 640x480 fisheye footage, split by capture group encoded in filenames
# --------------------------------------------------------------------------

MENDELEY_GROUP_SUFFIX = ("_2", "_3", "_AR")


def mendeley_group(path: Path) -> str:
    stem = path.stem.upper()
    for suffix in MENDELEY_GROUP_SUFFIX:
        if stem.endswith(suffix.upper()):
            return suffix.lstrip("_").upper()
    return "BASE"


def load_mendeley(root: Path, split: str) -> Samples:
    """split: train (BASE+AR) | val (group 2) | test (group 3)."""
    wanted = {"train": {"BASE", "AR"}, "val": {"2"}, "test": {"3"}}[split]
    records = [
        {"path": str(path), "label": label, "group": mendeley_group(path)}
        for label, paths in _letter_images(root).items()
        for path in paths
        if mendeley_group(path) in wanted
    ]
    return _observe_images(records, f"mendeley:{split}")


# --------------------------------------------------------------------------
# Kaggle: square close-up images, one image out of three held out per class
# --------------------------------------------------------------------------


def load_kaggle(root: Path, split: str) -> Samples:
    """Only twelve images per letter exist, so this corpus has no val split."""
    buckets = {0: "train", 1: "train", 2: "test"}
    records = [
        {"path": str(path), "label": label}
        for label, paths in _letter_images(root).items()
        for index, path in enumerate(paths)
        if buckets[index % 3] == split
    ]
    if not records:
        return empty_samples(f"kaggle:{split}")
    return _observe_images(records, f"kaggle:{split}", progress_every=100)


# --------------------------------------------------------------------------
# Talkee: pre-extracted MediaPipe landmarks, split by whole sequence
# --------------------------------------------------------------------------

TALKEE_SPLIT_BOUNDS = {"train": (1, 80), "val": (81, 85), "test": (86, 100)}


def load_talkee(
    root: Path, split: str, frames: tuple[int, ...] = TALKEE_SETTLED_FRAMES
) -> Samples:
    low, high = TALKEE_SPLIT_BOUNDS[split]
    slots, masks, labels, failures = [], [], [], []
    attempted = 0
    for label in ALPHABET:
        letter_root = root / label
        if not letter_root.is_dir():
            raise FileNotFoundError(f"Talkee corpus is missing class {label}: {letter_root}")
        for sequence in sorted(
            (path for path in letter_root.iterdir() if path.is_dir()),
            key=lambda path: int(path.name) if path.name.isdigit() else 0,
        ):
            if not sequence.name.isdigit():
                continue
            if not low <= int(sequence.name) <= high:
                continue
            for frame in frames:
                frame_path = sequence / f"{frame}.npy"
                attempted += 1
                if not frame_path.exists():
                    failures.append({"path": str(frame_path), "label": label, "reason": "missing"})
                    continue
                raw = np.load(frame_path, allow_pickle=False).reshape(
                    MAX_HANDS, LANDMARKS_PER_HAND, 3
                )
                hands = [
                    to_isotropic(raw[index], TALKEE_ASPECT)
                    for index in range(MAX_HANDS)
                    if np.any(raw[index])
                ]
                if not hands:
                    failures.append({"path": str(frame_path), "label": label, "reason": "no_hands"})
                    continue
                slot, mask = _pack(hands)
                slots.append(slot)
                masks.append(mask)
                labels.append(label)
    return Samples(
        slots=np.asarray(slots),
        masks=np.asarray(masks),
        labels=np.asarray(labels),
        source=f"talkee:{split}",
        attempted=attempted,
        failures=failures,
    )


# --------------------------------------------------------------------------
# Real webcam validation set recorded with scripts/capture_webcam.py
# --------------------------------------------------------------------------


def load_real_world(root: Path) -> Samples:
    if not root.is_dir():
        return empty_samples("real_world")
    records = [
        {"path": str(path), "label": label}
        for label, paths in _letter_images(root).items()
        for path in paths
    ]
    if not records:
        return empty_samples("real_world")
    return _observe_images(records, "real_world", progress_every=50)


def concatenate(*groups: Samples) -> Samples:
    groups = tuple(group for group in groups if len(group))
    if not groups:
        return empty_samples("empty")
    return Samples(
        slots=np.concatenate([group.slots for group in groups]),
        masks=np.concatenate([group.masks for group in groups]),
        labels=np.concatenate([group.labels for group in groups]),
        source="+".join(group.source for group in groups),
        attempted=sum(group.attempted for group in groups),
        failures=[failure for group in groups for failure in group.failures],
    )
