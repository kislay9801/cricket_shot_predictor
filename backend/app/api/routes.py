from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import SUPPORTED_VIDEO_TYPES, UPLOAD_DIR
from app.models.schemas import WebcamFrameRequest
from app.services.action_classifier import ActionClassifier
from app.services.feature_service import sequence_features
from app.services.player_matcher import PlayerMatcher
from app.services.pose_service import PoseService
from app.services.reference_index import ReferenceIndex
from app.services.session_service import SessionService
from app.services.shot_classifier import ShotClassifier

router = APIRouter()
pose_service = PoseService()
reference_index = ReferenceIndex()
session_service = SessionService()


def analyze_frames(frames, mode: str):
    index = reference_index.load()
    if not index["shots"]:
        raise HTTPException(status_code=500, detail="No processed shot references found. Run the dataset builder first.")
    available_categories = {
        entry.get("category")
        for shot_data in index["shots"].values()
        for entry in shot_data.get("entries", [])
        if entry.get("category")
    }
    action = ActionClassifier().predict(frames, mode_hint=mode, available_categories=available_categories)
    action_type = action["action_type"]
    shot = ShotClassifier(index).predict(frames, mode=action_type)
    matched = PlayerMatcher(index).match(frames, shot["shot_slug"], mode=action_type)
    features = sequence_features(frames)
    return {
        **matched,
        "action_type": action_type,
        "action_prediction": action,
        "shot_prediction": shot["shot_type"],
        "shot_confidence": shot["confidence"],
        "top_shots": shot["top_shots"],
        "raw": {
            "mode": mode,
            "effective_action_type": action_type,
            "dataset_source": index["source"],
            "phase_markers": features["phases"],
            "temporal_features": features["temporal_features"],
        },
    }


@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...), mode: str = Form("batting")):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Upload a supported video file: mp4, mov, avi, mkv, or webm")

    session_id = session_service.new_id()
    video_path = UPLOAD_DIR / f"{session_id}{suffix}"
    video_path.write_bytes(await file.read())

    try:
        frames, overlays, fps, analysis_metadata = pose_service.analyze_video(video_path, session_id)
        result = analyze_frames(frames, mode=mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    payload = {
        "session_id": session_id,
        **result,
        "overlay_frames": overlays,
        "fps": round(fps, 2),
        "frame_count": len(frames),
        "report_url": f"/report/{session_id}",
        "raw": {**result.pop("raw", {}), "source": str(video_path), "analysis": analysis_metadata},
    }
    session_service.save(session_id, payload)
    return payload


@router.post("/webcam-frame")
async def webcam_frame(request: WebcamFrameRequest):
    session_id = request.session_id or session_service.new_id()
    try:
        image = pose_service.decode_base64_image(request.image_base64)
        frames, overlays, fps = pose_service.analyze_webcam_frame(image, session_id)
        result = analyze_frames(frames, mode=request.mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    payload = {
        "session_id": session_id,
        **result,
        "overlay_frames": overlays,
        "fps": round(fps, 2),
        "frame_count": len(frames),
        "report_url": f"/report/{session_id}",
        "raw": {**result.pop("raw", {}), "source": "webcam"},
    }
    session_service.save(session_id, payload)
    return payload


@router.get("/results")
async def results(session_id: str | None = None):
    try:
        return session_service.read(session_id) if session_id else session_service.latest()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/report/{session_id}")
async def report(session_id: str):
    try:
        payload = session_service.read(session_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "title": "Cricket Pose Matcher Report",
        "session_id": session_id,
        "best_match": payload["best_match"],
        "top_matches": payload["top_matches"],
        "action_type": payload.get("action_type"),
        "action_prediction": payload.get("action_prediction"),
        "shot_prediction": payload.get("shot_prediction"),
        "shot_confidence": payload.get("shot_confidence"),
        "top_shots": payload.get("top_shots", []),
        "coaching_feedback": payload["coaching_feedback"],
        "similarity_breakdown": payload["similarity_breakdown"],
    }
