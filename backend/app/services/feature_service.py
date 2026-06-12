from __future__ import annotations

from typing import Dict, List

import numpy as np

from app.services.matching_service import (
    angle_change_signature,
    bat_signature,
    build_temporal_shot_features,
    detect_shot_phases,
    motion_signature,
    sequence_embedding,
    torso_rotation_signature,
)
from app.services.pose_service import JOINTS, PoseFrame


def frame_to_dict(frame: PoseFrame) -> Dict:
    return {
        "landmarks": frame.landmarks,
        "normalized": frame.normalized,
        "angles": frame.angles,
        "torso": frame.torso,
        "bat": frame.bat,
        "embedding": frame.embedding,
        "confidence": frame.confidence,
    }


def sequence_features(frames: List[PoseFrame]) -> Dict:
    phases = detect_shot_phases(frames)
    sequence = sequence_embedding(frames).astype(float).round(6).tolist()
    follow = follow_through_embedding(frames, phases).astype(float).round(6).tolist()
    temporal = build_temporal_shot_features(frames)
    return {
        "sequence_embedding": sequence,
        "follow_through_embedding": follow,
        "motion_embedding": motion_signature(frames).astype(float).round(6).tolist(),
        "angle_change_embedding": angle_change_signature(frames).astype(float).round(6).tolist(),
        "torso_embedding": torso_rotation_signature(frames).astype(float).round(6).tolist(),
        "bat_embedding": bat_signature(frames).astype(float).round(6).tolist(),
        "temporal_features": {key: normalize_json_value(value) for key, value in temporal.items()},
        "phases": phases,
        "frame_count": len(frames),
        "avg_confidence": float(np.mean([frame.confidence for frame in frames])) if frames else 0.0,
    }


def follow_through_embedding(frames: List[PoseFrame], phases: Dict[str, int] | None = None) -> np.ndarray:
    if not frames:
        return np.zeros(18, dtype=np.float32)
    phases = phases or detect_shot_phases(frames)
    start = phases.get("follow_through", max(0, len(frames) - 1))
    segment = frames[start:] or [frames[-1]]
    final = segment[-1]
    first = frames[0]
    wrist_final = np.array(
        [
            final.normalized[15][0],
            final.normalized[15][1],
            final.normalized[16][0],
            final.normalized[16][1],
        ],
        dtype=np.float32,
    )
    wrist_height_change = np.array(
        [
            final.normalized[15][1] - first.normalized[15][1],
            final.normalized[16][1] - first.normalized[16][1],
        ],
        dtype=np.float32,
    )
    elbow_angles = np.array(
        [final.angles["left_elbow"] / 180.0, final.angles["right_elbow"] / 180.0],
        dtype=np.float32,
    )
    torso = np.array(
        [
            final.torso["shoulder_line_angle"] / 180.0,
            final.torso["hip_line_angle"] / 180.0,
            final.torso["hip_shoulder_separation"] / 180.0,
        ],
        dtype=np.float32,
    )
    segment_angles = np.array([[frame.angles[name] / 180.0 for name in JOINTS] for frame in segment], dtype=np.float32)
    return np.concatenate([wrist_final, wrist_height_change, elbow_angles, torso, segment_angles.mean(axis=0), segment_angles.std(axis=0)])


def average_vectors(vectors: List[List[float]]) -> List[float]:
    if not vectors:
        return []
    max_len = max(len(vector) for vector in vectors)
    padded = np.array([vector + [0.0] * (max_len - len(vector)) for vector in vectors], dtype=np.float32)
    return padded.mean(axis=0).astype(float).round(6).tolist()


def normalize_json_value(value):
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, float):
        return round(value, 6)
    return value
