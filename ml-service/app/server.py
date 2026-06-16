"""FastAPI inference service for ShotSense.

Run:
    python -m uvicorn app.server:app --host 0.0.0.0 --port 8000
(from the ml-service directory, with the venv active)

The Next.js app calls this via the ML_INFERENCE_URL env var:
    ML_INFERENCE_URL=http://localhost:8000/predict
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os

from .infer import ShotClassifier

app = FastAPI(title="ShotSense ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model once at startup.
_classifier: ShotClassifier | None = None


def get_classifier() -> ShotClassifier:
    global _classifier
    if _classifier is None:
        _classifier = ShotClassifier()
    return _classifier


class PredictBody(BaseModel):
    videoUrl: str


@app.get("/")
def root():
    return {
        "service": "ShotSense ML",
        "endpoints": ["/health", "POST /predict", "POST /predict-file"],
    }


@app.get("/health")
def health():
    try:
        meta = get_classifier().meta
        return {"status": "ok", "model": meta.get("model"),
                "labels": meta.get("labels"), "cvAccuracy": meta.get("cv_accuracy")}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/predict")
def predict(body: PredictBody):
    if not body.videoUrl:
        raise HTTPException(status_code=400, detail="videoUrl is required")
    try:
        return get_classifier().classify_url(body.videoUrl)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")


@app.post("/predict-file")
async def predict_file(file: UploadFile = File(...)):
    """Direct file upload — handy for local testing without Firebase."""
    suffix = os.path.splitext(file.filename or "clip.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        tmp.write(await file.read())
    try:
        return get_classifier().classify_file(tmp_path)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


async def _save_temp(file: UploadFile) -> str:
    suffix = os.path.splitext(file.filename or "clip.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        return tmp.name


@app.post("/compare-files")
async def compare_files(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
):
    """Compare two clips' biomechanics with MediaPipe pose features."""
    a = await _save_temp(fileA)
    b = await _save_temp(fileB)
    try:
        return get_classifier().compare_files(a, b)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Comparison failed: {e}")
    finally:
        for p in (a, b):
            try:
                os.remove(p)
            except OSError:
                pass
