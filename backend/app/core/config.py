import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]
DATASET_DIR = BASE_DIR / "dataset"
SHOTS_DIR = DATASET_DIR / "shots"
PLAYERS_DIR = DATASET_DIR / "players"
# Writable storage for uploads/overlays/sessions. Override with STORAGE_DIR on hosts
# where the app directory is read-only (e.g. set STORAGE_DIR=/tmp/storage on Cloud Run).
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", BASE_DIR / "backend" / "app" / "storage"))
UPLOAD_DIR = STORAGE_DIR / "uploads"
OVERLAY_DIR = STORAGE_DIR / "overlays"
DEBUG_DIR = STORAGE_DIR / "debug"
SESSION_DIR = STORAGE_DIR / "sessions"

SUPPORTED_VIDEO_TYPES = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

# Analysis is tunable via env so the same code runs fast on a small free-tier
# instance and richer on a beefy machine. Defaults are tuned for speed.
MAX_ANALYSIS_FRAMES = int(os.environ.get("CPM_MAX_FRAMES", "24"))
# Downscale frames to at most this width before pose detection. MediaPipe returns
# normalized (0-1) landmarks regardless of resolution, so this is a big speedup
# with negligible accuracy loss.
MAX_FRAME_WIDTH = int(os.environ.get("CPM_MAX_FRAME_WIDTH", "640"))
# 0 = lite/fastest, 1 = full (default), 2 = heavy.
POSE_MODEL_COMPLEXITY = int(os.environ.get("CPM_MODEL_COMPLEXITY", "1"))
# Static mode re-detects the person on every frame (no frame-to-frame tracking).
# Off for live video (tracking is faster/smoother); ON for offline reference
# building, where it recovers far more frames from choppy, multi-cut footage.
POSE_STATIC_IMAGE_MODE = os.environ.get("CPM_STATIC_IMAGE_MODE", "0") == "1"
MIN_DETECTION_CONFIDENCE = float(os.environ.get("CPM_MIN_DETECTION_CONFIDENCE", "0.45"))
# Overlay skeleton images are expensive (encode + disk write per frame) and are
# no longer shown in the UI, so they are off by default.
ENABLE_OVERLAYS = os.environ.get("CPM_ENABLE_OVERLAYS", "0") == "1"

VIDEO_ANALYSIS_START_RATIO = 0.25
VIDEO_ANALYSIS_END_RATIO = 0.75
VIDEO_FRAME_STRIDE = 2
REFERENCE_FILE = "landmarks.json"
CONFIDENCE_THRESHOLD = 0.65

for directory in (UPLOAD_DIR, OVERLAY_DIR, DEBUG_DIR, SESSION_DIR):
    directory.mkdir(parents=True, exist_ok=True)
