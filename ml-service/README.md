# ShotSense ML service 🏏🤖

Real cricket-shot recognition, trained on the clips in `../dataset/batting/`.
This is the engine behind the app's **main feature** — it replaces the mock in
the Next.js app when you set `ML_INFERENCE_URL`.

## How it works

1. **Pose** — [MediaPipe Pose](https://ai.google.dev/edge/mediapipe) (Tasks API,
   `pose_landmarker_full`, **CPU delegate forced** so landmarks match across
   platforms) extracts 33 3D body landmarks from up to **96 sampled frames**.
2. **Features** — hip-centred *world* landmarks → biomechanical features that
   separate the shots: joint angles (elbow/knee/shoulder), torso lean, hand
   trajectory, **swing plane** (vertical vs cross-bat), shoulder/hip rotation,
   peak hand speed. See [app/features.py](app/features.py).
3. **Classifier** — a scikit-learn pipeline (StandardScaler + LogisticRegression
   or RandomForest, whichever wins **leave-one-out cross-validation**).
4. **Serve** — FastAPI exposes `POST /predict { videoUrl }` returning the exact
   shape the app expects.

> **Scope:** the dataset has **3 shot types** — Cover Drive, Pull Shot,
> Straight Drive — so the model predicts among those three (~42 clips, all used).
> Current honest metric: **~70% leave-one-out CV accuracy**. The clips are real
> broadcast footage (camera cuts, wide angles), which is hard for pose
> estimation — add more clean, side-on, single-shot clips per class to improve it.
>
> **Note on the model:** the *full* pose model is used deliberately — the *lite*
> model's landmarks drift between platforms (Windows train vs Linux serve) and
> collapsed every server prediction to one class. The CPU delegate + full model
> keep train and serve consistent.

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

| Method | Path            | Body                          | Purpose                                  |
|--------|-----------------|-------------------------------|------------------------------------------|
| GET    | `/health`       | —                             | lightweight liveness (no model load)     |
| GET    | `/info`         | —                             | model name, labels, CV accuracy          |
| POST   | `/predict`      | `{ "videoUrl": "https://…" }` | classify a clip by URL                   |
| POST   | `/predict-file` | multipart `file=@clip.mp4`    | classify a local upload                  |
| POST   | `/compare-files`| multipart `fileA=…&fileB=…`   | compare two clips (the app does this client-side instead, to fit free-tier memory) |

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
serverless). The repo ships a `Dockerfile` + root `render.yaml` for **Render**
(also works on Railway / Fly.io / Cloud Run). The trained model + pose model are
committed, so deploys don't retrain. Set `ML_INFERENCE_URL` on Vercel to the
deployed URL + `/predict`.

**Free-tier (512 MB) caveats:** single-clip `/predict` fits and runs in ~20–25 s;
the dyno cold-starts after idle. Two-clip `/compare-files` can exceed 512 MB, so
the app compares by running two separate single-clip analyses and computing the
similarity client-side instead.
