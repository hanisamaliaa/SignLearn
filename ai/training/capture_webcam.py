"""Record a labelled BISINDO validation set from the real webcam.

Every corpus in `data/` was filmed by someone else, with a different camera, at
a different distance.  Offline accuracy on those corpora cannot answer "does it
work for my users on their laptops", so this records the missing set.

Frames land in `ai/data/real_world/<LETTER>/` and are scored by
`ai.training.evaluate_model --real-world`.  Keep this set out of training: once
a model has trained on it, it stops being evidence.

    python -m ai.training.capture_webcam                 # all 26 letters
    python -m ai.training.capture_webcam --letters PQSKX # redo a few

Controls: SPACE starts a burst, R redoes the letter, S skips it, Q quits.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2

from ai.app.landmarks import HandLandmarkExtractor, expected_hand_count


ALPHABET = tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
GREEN, AMBER, RED, WHITE = (80, 200, 80), (60, 190, 235), (60, 60, 235), (245, 245, 245)


def _banner(frame, lines: list[tuple[str, tuple[int, int, int], float]]) -> None:
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (frame.shape[1], 34 + 30 * len(lines)), (25, 25, 25), -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)
    for index, (text, colour, scale) in enumerate(lines):
        cv2.putText(
            frame, text, (16, 30 + 30 * index),
            cv2.FONT_HERSHEY_SIMPLEX, scale, colour, 2, cv2.LINE_AA,
        )


def _draw_landmarks(frame, observation) -> None:
    height, width = frame.shape[:2]
    for hand in observation.hands:
        for point in hand.points:
            # Landmarks are isotropic (y scaled by height/width); undo for drawing.
            x = int(point[0] * width)
            y = int(point[1] / (height / width) * height)
            cv2.circle(frame, (x, y), 3, (40, 220, 250), -1)


def capture_letter(camera, extractor, letter: str, output: Path, burst: int, delay: int) -> str:
    """Return 'done', 'skip' or 'quit'."""
    expected = expected_hand_count(letter)
    saved = 0
    countdown = 0
    while True:
        ok, frame = camera.read()
        if not ok:
            raise RuntimeError("Webcam frame could not be read.")
        frame = cv2.flip(frame, 1)
        preview = frame.copy()
        observation = extractor.observe(frame)
        hands = len(observation.relevant_hands) if observation else 0
        if observation:
            _draw_landmarks(preview, observation)

        matches = hands == expected
        status_colour = GREEN if matches else (AMBER if hands else RED)
        status = (
            f"{hands}/{expected} tangan terlihat"
            if hands
            else "tangan tidak terdeteksi"
        )
        _banner(preview, [
            (f"Huruf {letter}   ({expected} tangan)", WHITE, 0.9),
            (status, status_colour, 0.7),
            (f"tersimpan {saved}/{burst}   SPACE=rekam  R=ulang  S=lewati  Q=keluar", WHITE, 0.55),
        ])
        if countdown:
            cv2.putText(
                preview, str(countdown), (preview.shape[1] // 2 - 30, preview.shape[0] // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 4.0, WHITE, 6, cv2.LINE_AA,
            )
        cv2.imshow("SignLearn - rekam validasi BISINDO", preview)

        key = cv2.waitKey(delay) & 0xFF
        if key == ord("q"):
            return "quit"
        if key == ord("s"):
            return "skip"
        if key == ord("r"):
            for existing in output.glob(f"{letter}_*.jpg"):
                existing.unlink()
            saved = 0
            continue
        if key == ord(" ") or (saved and saved < burst):
            if not matches:
                # Recording a two-handed letter with one hand visible would
                # reproduce exactly the corruption that broke the old model.
                countdown = 0
                continue
            output.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(output / f"{letter}_{saved:03d}.jpg"), frame)
            saved += 1
            if saved >= burst:
                return "done"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("ai/data/real_world"))
    parser.add_argument("--letters", default="".join(ALPHABET))
    parser.add_argument("--burst", type=int, default=10, help="frames saved per letter")
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--delay", type=int, default=25)
    args = parser.parse_args()

    letters = [letter.upper() for letter in args.letters if letter.upper() in ALPHABET]
    camera = cv2.VideoCapture(args.camera, cv2.CAP_DSHOW)
    if not camera.isOpened():
        raise SystemExit(f"Webcam {args.camera} could not be opened.")
    extractor = HandLandmarkExtractor(static_image_mode=False)
    try:
        for letter in letters:
            print(f"Merekam huruf {letter} ({expected_hand_count(letter)} tangan)...", flush=True)
            outcome = capture_letter(
                camera, extractor, letter, args.output / letter, args.burst, args.delay
            )
            if outcome == "quit":
                print("Dihentikan.")
                break
            print(f"  {letter}: {outcome}", flush=True)
    finally:
        extractor.close()
        camera.release()
        cv2.destroyAllWindows()

    total = sum(1 for _ in args.output.rglob("*.jpg")) if args.output.exists() else 0
    print(f"\n{total} frame tersimpan di {args.output}")
    print("Jalankan: python -m ai.training.evaluate_model --real-world")


if __name__ == "__main__":
    main()
