"""MediaPipe-based pose extraction from a video clip.

Uses the Tasks API (PoseLandmarker, VIDEO mode) and returns the sequence of
3D *world* landmarks (origin at the hip centre, units ~metres) which are
translation/scale invariant and therefore good for biomechanical features.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

# Full model: the lite model's landmarks vary too much across platforms
# (Windows train vs Linux serve), which collapsed predictions to one class on
# Render. Full is more stable cross-platform; speed is kept in check by the
# 48-frame cap in extract(). Retrain whenever you switch models.
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "pose_model", "pose_landmarker_full.task"
)

# BlazePose 33-landmark indices we care about.
NOSE = 0
L_SHOULDER, R_SHOULDER = 11, 12
L_ELBOW, R_ELBOW = 13, 14
L_WRIST, R_WRIST = 15, 16
L_HIP, R_HIP = 23, 24
L_KNEE, R_KNEE = 25, 26
L_ANKLE, R_ANKLE = 27, 28


@dataclass
class PoseSequence:
    world: np.ndarray  # (T, 33, 3) world landmarks
    visibility: np.ndarray  # (T, 33)
    detection_rate: float  # fraction of sampled frames with a pose
    n_frames: int  # number of frames with a detected pose


class PoseExtractor:
    """Reusable landmarker. Create once, call extract() many times."""

    def __init__(self, model_path: str = MODEL_PATH):
        # Force the CPU delegate so landmark values are identical across
        # environments. Otherwise MediaPipe may use a GPU/GL path where one is
        # available (e.g. on the server) and produce shifted features that the
        # locally-trained classifier misreads. Train + serve MUST match.
        base = mp_python.BaseOptions(
            model_asset_path=model_path,
            delegate=mp_python.BaseOptions.Delegate.CPU,
        )
        # IMAGE mode: each frame is detected independently. This lets a single
        # landmarker be reused across many clips (VIDEO mode requires strictly
        # increasing timestamps within one instance) and is plenty for the
        # aggregate, order-invariant features we compute.
        options = vision.PoseLandmarkerOptions(
            base_options=base,
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
        )
        self._landmarker = vision.PoseLandmarker.create_from_options(options)

    def extract(self, video_path: str, max_samples: int = 48) -> PoseSequence:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        # Sample at most `max_samples` frames evenly (ceil division caps the
        # count even for short clips → bounded, fast pose extraction).
        stride = max(1, -(-total // max_samples)) if total > 0 else 2

        world_frames: list[np.ndarray] = []
        vis_frames: list[np.ndarray] = []
        sampled = 0
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % stride != 0:
                idx += 1
                continue
            sampled += 1
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = self._landmarker.detect(mp_image)
            if result.pose_world_landmarks:
                lms = result.pose_world_landmarks[0]
                world_frames.append(
                    np.array([[lm.x, lm.y, lm.z] for lm in lms], dtype=np.float32)
                )
                vis_frames.append(
                    np.array([lm.visibility for lm in lms], dtype=np.float32)
                )
            idx += 1
        cap.release()

        detection_rate = (len(world_frames) / sampled) if sampled else 0.0
        if not world_frames:
            return PoseSequence(
                world=np.zeros((0, 33, 3), np.float32),
                visibility=np.zeros((0, 33), np.float32),
                detection_rate=0.0,
                n_frames=0,
            )
        return PoseSequence(
            world=np.stack(world_frames),
            visibility=np.stack(vis_frames),
            detection_rate=detection_rate,
            n_frames=len(world_frames),
        )

    def close(self):
        self._landmarker.close()
