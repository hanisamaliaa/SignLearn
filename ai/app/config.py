import os
from dataclasses import dataclass, replace
from pathlib import Path

from dotenv import load_dotenv


AI_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AI_ROOT / ".env")


def _csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    model_path: Path = Path(
        os.getenv("BISINDO_MODEL_PATH", "models/bisindo_geometry_v6.pkl")
    )
    cors_origins: tuple[str, ...] = _csv(
        os.getenv(
            "AI_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        )
    )
    max_image_bytes: int = int(os.getenv("AI_MAX_IMAGE_BYTES", 2_000_000))
    min_detection_confidence: float = float(
        os.getenv("AI_MIN_DETECTION_CONFIDENCE", 0.5)
    )
    min_tracking_confidence: float = float(
        os.getenv("AI_MIN_TRACKING_CONFIDENCE", 0.5)
    )
    min_hand_span: float = float(os.getenv("BISINDO_MIN_HAND_SPAN", 0.06))


settings = Settings()

if not settings.model_path.is_absolute():
    settings = replace(settings, model_path=AI_ROOT / settings.model_path)
