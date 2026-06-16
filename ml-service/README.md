# ShotSense ML service 🏏🤖

Real cricket-shot recognition, trained on the clips in `../dataset/batting/`.
This is the engine behind the app's **main feature** — it replaces the mock in
the Next.js app when you set `ML_INFERENCE_URL`.

## How it works

1. **Pose** — [MediaPipe Pose](https://ai.google.dev/edge/mediapipe) (Tasks API,
   `pose_landmarker_full`) extracts 33 3D body landmarks per sampled frame.
2. **Features** — hip-centred *world* landmarks → biomechanical features that
   separate the shots: joint angles (elbow/knee/shoulder), torso lean, hand
   trajectory, **swing plane** (vertical vs cross-bat), shoulder/hip rotation,
   peak hand speed. See [app/features.py](app/features.py).
3. **Classifier** — a scikit-learn pipeline (StandardScaler + LogisticRegression
   or RandomForest, whichever wins **leave-one-out cross-validation**).
4. **Serve** — FastAPI exposes `POST /predict { videoUrl }` returning the exact
   shape the app expects.

> **Scope:** the dataset has **3 shot types** — Cover Drive, Pull Shot,
> Straight Drive — so the model predicts among those three. All 42 clips are
> used (none skipped). Current honest metric: **~79% leave-one-out CV
> accuracy** (Cover 85% / Pull 86% / Straight 67% recall). The clips are real
> broadcast footage (camera cuts, wide angles), which is hard for pose
> estimation — add more clean, side-on, single-shot clips per class to improve it.

## Setup

```bash
cd ml-service
python -m venv .venv && .venv/Scripts/activate    # Windows
#   source .venv/bin/activate                      # macOS/Linux
pip install -r requirements.txt
```

The pose model lives in `pose_model/pose_landmarker_full.task` (already
downloaded; re-fetch from Google's MediaPipe model storage if missing).

## Train

```bash
# from ml-service/
python -m app.train            # uses cached features if present
python -m app.train --no-cache # re-extract poses from scratch
```

Prints per-clip pose-detection stats, leave-one-out CV accuracy + confusion
matrix, and writes `artifacts/model.joblib` and `artifacts/meta.json`.

## Serve

```bash
# from ml-service/
python -m uvicorn app.server:app --host 0.0.0.0 --port 8000
```

Endpoints:

| Method | Path           | Body                         | Purpose                       |
|--------|----------------|------------------------------|-------------------------------|
| GET    | `/health`      | —                            | model name, labels, CV acc.   |
| POST   | `/predict`     | `{ "videoUrl": "https://…" }`| classify a clip by URL        |
| POST   | `/predict-file`| multipart `file=@clip.mp4`   | classify a local upload       |

Response:

```json
{
  "predictedShot": "Pull Shot",
  "confidence": 71,
  "topPredictions": [
    { "shot": "Pull Shot", "confidence": 71 },
    { "shot": "Cover Drive", "confidence": 18 },
    { "shot": "Straight Drive", "confidence": 11 }
  ],
  "detectedIndicators": ["Cross-bat (horizontal) swing plane", "Strong shoulder rotation"],
  "poseFrames": 47,
  "detectionRate": 0.83
}
```

## Connect it to the app

In the Next.js project's `.env.local`:

```env
ML_INFERENCE_URL=http://localhost:8000/predict
```

`/api/predict` now calls this service and falls back to the mock only if it's
unreachable.

## Deploy

This service needs a real container (MediaPipe + OpenCV won't run on Vercel
serverless). Good free-ish options: **Render**, **Railway**, **Fly.io**, or
**Google Cloud Run**. Expose port 8000, commit `artifacts/` (the trained model)
so the container doesn't need to retrain, and set `ML_INFERENCE_URL` on Vercel
to the deployed URL.
