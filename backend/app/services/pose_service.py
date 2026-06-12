import base64
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np

from app.core.config import (
    DEBUG_DIR,
    MAX_ANALYSIS_FRAMES,
    OVERLAY_DIR,
    VIDEO_ANALYSIS_END_RATIO,
    VIDEO_ANALYSIS_START_RATIO,
    VIDEO_FRAME_STRIDE,
)


JOINTS = {
    "left_elbow": (11, 13, 15),
    "right_elbow": (12, 14, 16),
    "left_shoulder": (13, 11, 23),
    "right_shoulder": (14, 12, 24),
    "left_hip": (11, 23, 25),
    "right_hip": (12, 24, 26),
    "left_knee": (23, 25, 27),
    "right_knee": (24, 26, 28),
}


@dataclass
class PoseFrame:
    landmarks: List[List[float]]
    normalized: List[List[float]]
    angles: Dict[str, float]
    torso: Dict[str, float]
    bat: Dict[str, float]
    embedding: List[float]
    confidence: float


class PoseService:
    """Owns MediaPipe pose detection and feature extraction."""

    def __init__(self) -> None:
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.45,
            min_tracking_confidence=0.45,
        )

    def decode_base64_image(self, image_base64: str) -> np.ndarray:
        payload = image_base64.split(",")[-1]
        data = base64.b64decode(payload)
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image")
        return image

    def analyze_webcam_frame(self, frame: np.ndarray, session_id: str) -> Tuple[List[PoseFrame], List[str], float]:
        start = time.perf_counter()
        pose_frame, overlay = self._process_frame(frame, session_id, 0)
        elapsed = time.perf_counter() - start
        fps = 1.0 / elapsed if elapsed > 0 else 0.0
        return ([pose_frame] if pose_frame else []), ([overlay] if overlay else []), fps

    def analyze_video(self, video_path: Path, session_id: str) -> Tuple[List[PoseFrame], List[str], float, Dict]:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError("Could not open uploaded video")

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or MAX_ANALYSIS_FRAMES
        start_frame, end_frame, window_debug = detect_active_window(cap, total)
        action_frames = max(end_frame - start_frame, 1)
        step = max(VIDEO_FRAME_STRIDE, action_frames // MAX_ANALYSIS_FRAMES)
        frames: List[PoseFrame] = []
        overlays: List[str] = []
        read_count = start_frame
        start = time.perf_counter()
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        while len(frames) < MAX_ANALYSIS_FRAMES and read_count < end_frame:
            ok, frame = cap.read()
            if not ok:
                break
            if (read_count - start_frame) % step == 0:
                pose_frame, overlay = self._process_frame(frame, session_id, len(frames))
                if pose_frame:
                    frames.append(pose_frame)
                    if overlay and len(overlays) < 8:
                        overlays.append(overlay)
            read_count += 1

        cap.release()
        elapsed = time.perf_counter() - start
        processed_span = max(read_count - start_frame, 0)
        fps = processed_span / elapsed if elapsed > 0 else 0.0
        metadata = {
            "total_frames": total,
            "active_window": {"start_frame": start_frame, "end_frame": end_frame, **window_debug},
            "frame_stride": step,
            "processed_frame_span": processed_span,
        }
        write_debug_metadata(session_id, metadata)
        return frames, overlays, fps, metadata

    def _process_frame(self, frame: np.ndarray, session_id: str, index: int) -> Tuple[Optional[PoseFrame], Optional[str]]:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.pose.process(rgb)
        if not result.pose_landmarks:
            return None, None

        landmarks = [
            [lm.x, lm.y, lm.z, lm.visibility]
            for lm in result.pose_landmarks.landmark
        ]
        normalized = normalize_landmarks(landmarks)
        angles = joint_angles(normalized)
        torso = torso_features(normalized)
        bat = detect_bat_features(frame, landmarks)
        embedding = build_embedding(normalized, angles, torso, bat)
        confidence = float(np.mean([lm[3] for lm in landmarks]))

        overlay_url = self._save_overlay(frame, result.pose_landmarks, session_id, index, bat)
        return PoseFrame(landmarks, normalized, angles, torso, bat, embedding, confidence), overlay_url

    def _save_overlay(self, frame: np.ndarray, pose_landmarks, session_id: str, index: int, bat: Dict[str, float]) -> str:
        canvas = frame.copy()
        self.mp_drawing.draw_landmarks(
            canvas,
            pose_landmarks,
            self.mp_pose.POSE_CONNECTIONS,
            self.mp_drawing.DrawingSpec(color=(0, 255, 180), thickness=2, circle_radius=2),
            self.mp_drawing.DrawingSpec(color=(255, 90, 60), thickness=2),
        )
        if bat.get("confidence", 0.0) > 0.0:
            pt1 = (int(bat["x1"]), int(bat["y1"]))
            pt2 = (int(bat["x2"]), int(bat["y2"]))
            cv2.line(canvas, pt1, pt2, (0, 215, 255), 4)
        out_dir = OVERLAY_DIR / session_id
        out_dir.mkdir(parents=True, exist_ok=True)
        file_path = out_dir / f"frame_{index:04d}.jpg"
        cv2.imwrite(str(file_path), canvas)
        return f"/static/overlays/{session_id}/{file_path.name}"


def normalize_landmarks(landmarks: List[List[float]]) -> List[List[float]]:
    """Translate to hip center and scale by torso size so body size/camera distance matter less."""
    arr = np.array(landmarks, dtype=np.float32)
    hips = (arr[23, :3] + arr[24, :3]) / 2.0
    shoulders = (arr[11, :3] + arr[12, :3]) / 2.0
    torso = np.linalg.norm(shoulders - hips)
    scale = torso if torso > 1e-6 else 1.0
    coords = (arr[:, :3] - hips) / scale
    return np.concatenate([coords, arr[:, 3:4]], axis=1).round(5).tolist()


def angle_between(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denom < 1e-8:
        return 0.0
    cosine = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(math.degrees(math.acos(cosine)))


def joint_angles(normalized: List[List[float]]) -> Dict[str, float]:
    pts = np.array(normalized, dtype=np.float32)[:, :3]
    return {
        name: round(angle_between(pts[a], pts[b], pts[c]), 3)
        for name, (a, b, c) in JOINTS.items()
    }


def line_angle(a: np.ndarray, b: np.ndarray) -> float:
    return float(math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])))


def angle_delta(a: float, b: float) -> float:
    return float((a - b + 180.0) % 360.0 - 180.0)


def torso_features(normalized: List[List[float]]) -> Dict[str, float]:
    """Cricket-specific trunk mechanics: shoulder line, hip line, and separation."""
    pts = np.array(normalized, dtype=np.float32)[:, :3]
    shoulder_angle = line_angle(pts[11], pts[12])
    hip_angle = line_angle(pts[23], pts[24])
    separation = angle_delta(shoulder_angle, hip_angle)
    return {
        "shoulder_line_angle": round(shoulder_angle, 3),
        "hip_line_angle": round(hip_angle, 3),
        "hip_shoulder_separation": round(separation, 3),
    }


def detect_bat_features(frame: np.ndarray, landmarks: List[List[float]]) -> Dict[str, float]:
    """Lightweight bat cue using long straight Hough lines near either wrist."""
    height, width = frame.shape[:2]
    wrists = np.array(
        [
            [landmarks[15][0] * width, landmarks[15][1] * height],
            [landmarks[16][0] * width, landmarks[16][1] * height],
        ],
        dtype=np.float32,
    )
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 60, 160)
    min_line = max(35, int(min(width, height) * 0.08))
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=45, minLineLength=min_line, maxLineGap=12)
    if lines is None:
        return empty_bat_features()

    best = None
    for line in lines[:, 0, :]:
        x1, y1, x2, y2 = [float(value) for value in line]
        p1 = np.array([x1, y1], dtype=np.float32)
        p2 = np.array([x2, y2], dtype=np.float32)
        length = float(np.linalg.norm(p2 - p1))
        if length < min_line:
            continue
        midpoint = (p1 + p2) / 2.0
        wrist_distance = float(min(np.linalg.norm(midpoint - wrists[0]), np.linalg.norm(midpoint - wrists[1])))
        distance_score = 1.0 / (1.0 + wrist_distance / max(width, height) * 10.0)
        length_score = min(length / max(width, height), 1.0)
        score = 0.65 * distance_score + 0.35 * length_score
        if best is None or score > best["score"]:
            best = {"score": score, "x1": x1, "y1": y1, "x2": x2, "y2": y2, "length": length}

    if best is None or best["score"] < 0.25:
        return empty_bat_features()

    angle = math.degrees(math.atan2(best["y2"] - best["y1"], best["x2"] - best["x1"]))
    return {
        "angle": round(angle, 3),
        "length": round(best["length"] / max(width, height), 5),
        "confidence": round(min(best["score"], 1.0), 5),
        "x1": round(best["x1"], 2),
        "y1": round(best["y1"], 2),
        "x2": round(best["x2"], 2),
        "y2": round(best["y2"], 2),
    }


def empty_bat_features() -> Dict[str, float]:
    return {"angle": 0.0, "length": 0.0, "confidence": 0.0, "x1": 0.0, "y1": 0.0, "x2": 0.0, "y2": 0.0}


def build_embedding(
    normalized: List[List[float]],
    angles: Dict[str, float],
    torso: Optional[Dict[str, float]] = None,
    bat: Optional[Dict[str, float]] = None,
) -> List[float]:
    arr = np.array(normalized, dtype=np.float32)
    keypoints = arr[[11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28], :3].flatten()
    angle_vec = np.array([angles[name] / 180.0 for name in JOINTS], dtype=np.float32)
    visibility = arr[[11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28], 3]
    torso = torso or torso_features(normalized)
    bat = bat or empty_bat_features()
    torso_vec = np.array(
        [
            torso["shoulder_line_angle"] / 180.0,
            torso["hip_line_angle"] / 180.0,
            torso["hip_shoulder_separation"] / 180.0,
        ],
        dtype=np.float32,
    )
    bat_vec = np.array([bat["angle"] / 180.0, bat["length"], bat["confidence"]], dtype=np.float32)
    return np.concatenate([keypoints, angle_vec, torso_vec, bat_vec, visibility]).round(5).tolist()


def wrist_trajectory(frames: List[PoseFrame]) -> List[float]:
    if len(frames) < 2:
        return [0.0, 0.0, 0.0, 0.0]
    wrists = np.array([[f.normalized[15][0], f.normalized[15][1], f.normalized[16][0], f.normalized[16][1]] for f in frames])
    delta = wrists[-1] - wrists[0]
    speed = np.mean(np.linalg.norm(np.diff(wrists, axis=0), axis=1))
    return [float(delta[0]), float(delta[1]), float(delta[2]), float(speed)]


def detect_active_window(cap: cv2.VideoCapture, total: int) -> Tuple[int, int, Dict]:
    """Cheap frame-difference pass before MediaPipe; falls back to the cricket action window."""
    fallback_start = int(total * VIDEO_ANALYSIS_START_RATIO)
    fallback_end = max(fallback_start + 1, int(total * VIDEO_ANALYSIS_END_RATIO))
    sample_step = max(total // 120, 1)
    previous = None
    motion = []
    positions = []
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    for frame_index in range(0, total, sample_step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, frame = cap.read()
        if not ok:
            continue
        gray = cv2.cvtColor(cv2.resize(frame, (160, 90)), cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        if previous is not None:
            diff = cv2.absdiff(gray, previous)
            # Center-weight the frame so ball-follow camera pans at the edges matter less.
            center = diff[18:72, 32:128]
            motion.append(float(np.mean(center)))
            positions.append(frame_index)
        previous = gray

    if len(motion) < 4:
        return fallback_start, fallback_end, {"method": "fallback", "reason": "insufficient_motion_samples"}

    values = np.array(motion, dtype=np.float32)
    threshold = float(np.median(values) + 0.75 * np.std(values))
    active = [positions[i] for i, value in enumerate(values) if value >= threshold]
    if not active:
        return fallback_start, fallback_end, {"method": "fallback", "reason": "no_motion_above_threshold", "threshold": threshold}

    detected_start = max(0, min(active) - sample_step * 2)
    detected_end = min(total - 1, max(active) + sample_step * 3)
    min_span = max(int(total * 0.18), 8)
    if detected_end - detected_start < min_span:
        return fallback_start, fallback_end, {"method": "fallback", "reason": "detected_window_too_short", "threshold": threshold}

    # Keep cricket-action priors: avoid early run-up/waiting and late ball-follow/replay.
    start = max(detected_start, int(total * 0.12))
    end = min(detected_end, int(total * 0.88))
    if end <= start:
        return fallback_start, fallback_end, {"method": "fallback", "reason": "clamped_window_invalid", "threshold": threshold}
    return start, end, {
        "method": "motion",
        "threshold": round(threshold, 4),
        "raw_start_frame": detected_start,
        "raw_end_frame": detected_end,
        "sample_step": sample_step,
    }


def write_debug_metadata(session_id: str, metadata: Dict) -> None:
    import json

    out_dir = DEBUG_DIR / session_id
    out_dir.mkdir(parents=True, exist_ok=True)
    with (out_dir / "analysis_window.json").open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)
