from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .classifier import BisindoClassifier
from .config import settings


classifier: BisindoClassifier | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global classifier
    classifier = BisindoClassifier(
        model_path=settings.model_path,
        min_detection_confidence=settings.min_detection_confidence,
        min_tracking_confidence=settings.min_tracking_confidence,
        feature_mode=settings.feature_mode,
    )
    yield
    classifier.close()
    classifier = None


app = FastAPI(
    title="SignLearn BISINDO AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "signlearn-bisindo-ai",
        "modelLoaded": classifier is not None,
    }


@app.post("/api/v1/predict")
async def predict(request: Request):
    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Content-Type must be image/*.")

    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image body is empty.")
    if len(image_bytes) > settings.max_image_bytes:
        raise HTTPException(status_code=413, detail="Image is too large.")
    if classifier is None:
        raise HTTPException(status_code=503, detail="Classifier is not ready.")

    try:
        result = classifier.predict(image_bytes)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "detected": result.detected,
        "label": result.label,
        "confidence": round(result.confidence, 6),
        "handsDetected": result.hands_detected,
        "probabilities": result.probabilities or {},
        "secondLabel": result.second_label,
        "margin": round(result.margin, 6),
    }
