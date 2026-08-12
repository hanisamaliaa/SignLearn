from __future__ import annotations

import cv2
import numpy as np


def augment_webcam(image: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Mild webcam-like augmentation. Mirroring is intentionally excluded."""
    height, width = image.shape[:2]
    angle = rng.uniform(-12, 12)
    scale = rng.uniform(0.92, 1.08)
    center = (width / 2, height / 2)
    matrix = cv2.getRotationMatrix2D(center, angle, scale)
    matrix[:, 2] += (rng.uniform(-0.04, 0.04) * width, rng.uniform(-0.04, 0.04) * height)
    result = cv2.warpAffine(
        image,
        matrix,
        (width, height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT_101,
    )

    alpha = rng.uniform(0.82, 1.18)
    beta = rng.uniform(-18, 18)
    result = cv2.convertScaleAbs(result, alpha=alpha, beta=beta)

    if rng.random() < 0.35:
        result = cv2.GaussianBlur(result, (3, 3), rng.uniform(0.2, 0.8))
    if rng.random() < 0.35:
        noise = rng.normal(0, rng.uniform(1.0, 5.0), result.shape)
        result = np.clip(result.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    if rng.random() < 0.35:
        quality = int(rng.integers(70, 94))
        ok, encoded = cv2.imencode(".jpg", result, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if ok:
            result = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    return result
