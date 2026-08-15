# SignLearn BISINDO AI Service

FastAPI service for conservative, realtime BISINDO alphabet recognition. The
browser sends a JPEG frame, MediaPipe extracts up to two hands, geometry-v5
builds 1,179 scale/translation-robust pose and contact features, and a calibrated
RBF SVM returns one of A-Z plus an acceptance decision.

## Run locally

```bash
cd ai
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

From the repository root, `npm run dev` starts the frontend and this service.
Health metadata is available at `GET /api/health`.

## Prediction API

`POST /api/v1/predict` accepts an image body with `Content-Type: image/jpeg`.

```json
{
  "detected": true,
  "accepted": true,
  "label": "A",
  "confidence": 0.97,
  "handsDetected": 2,
  "relevantHands": 2,
  "handSpan": 0.16,
  "probabilities": { "A": 0.97, "B": 0.01 },
  "secondLabel": "B",
  "margin": 0.96,
  "rejectionReason": null
}
```

`detected` means MediaPipe saw a hand. Only `accepted: true` is allowed to enter
the frontend temporal vote. Rejected reasons include `no_hands`,
`hand_too_small`, `low_confidence`, and `low_margin`.

## Production evaluation

The default model is `models/bisindo_geometry_v5.pkl`. Its conservative
signer-held-out accepted accuracy is 96.88% at 33.25% coverage; validation is
99.42% at 45.41% coverage. Raw signer-test accuracy is 74.68%. The legacy model
reaches only 5.97% on the same signer-test protocol.

See [MODEL_RESEARCH.md](MODEL_RESEARCH.md) and
[reports/production_v5.json](reports/production_v5.json) for the full audit,
per-class metrics, rejected alternatives, licensing, and limitations.

## Reproduce training

Raw datasets and generated feature caches are intentionally ignored by Git.
After downloading them, run the production training command from the repository
root:

```bash
npm run ai:train:production
```

The final refit uses exactly 26 output classes. Talkee's seven word classes are
never loaded.
