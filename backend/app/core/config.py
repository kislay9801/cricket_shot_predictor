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
MAX_ANALYSIS_FRAMES = 48
VIDEO_ANALYSIS_START_RATIO = 0.25
VIDEO_ANALYSIS_END_RATIO = 0.75
VIDEO_FRAME_STRIDE = 2
REFERENCE_FILE = "landmarks.json"
CONFIDENCE_THRESHOLD = 0.65

for directory in (UPLOAD_DIR, OVERLAY_DIR, DEBUG_DIR, SESSION_DIR):
    directory.mkdir(parents=True, exist_ok=True)
