"""Load the trained model and classify / compare cricket clips."""
from __future__ import annotations

import gc
import json
import os
import tempfile

import joblib
import numpy as np
import requests

from .pose import PoseExtractor
from .features import extract_features, features_to_vector, derive_indicators

ARTIFACTS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts")
MIN_FRAMES = 6


def _coach_metrics(m: dict) -> dict:
    """Human-interpretable per-clip biomechanics for the AI coach / compare."""
    return {
        "swing_plane_ratio": round(float(m.get("swing_ratio", 0.0)), 2),
        "shoulder_rotation_deg": round(float(m.get("shoulder_rot", 0.0)), 1),
        "hip_rotation_deg": round(float(m.get("hip_rot", 0.0)), 1),
        "front_knee_bend_deg": round(float(m.get("knee_bend_min", 180.0)), 1),
        "arm_extension_deg": round(float(m.get("elbow_max", 0.0)), 1),
        "hand_height": round(float(m.get("wrist_height_mean", 0.0)), 2),
    }


class ShotClassifier:
    def __init__(self):
        model_path = os.path.join(ARTIFACTS, "model.joblib")
        meta_path = os.path.join(ARTIFACTS, "meta.json")
        if not os.path.exists(model_path):
            raise FileNotFoundError("model.joblib not found — run `python -m app.train` first.")
        self.model = joblib.load(model_path)
        with open(meta_path) as f:
            self.meta = json.load(f)
        self.extractor = PoseExtractor()

    def _features_for(self, video_path: str):
        seq = self.extractor.extract(video_path)
        feats, metrics = extract_features(seq)
        return feats, metrics, seq

    def classify_file(self, video_path: str) -> dict:
        feats, metrics, seq = self._features_for(video_path)
        low_signal = seq.n_frames < MIN_FRAMES or metrics.get("valid", 0.0) == 0.0

        vec = features_to_vector(feats).reshape(1, -1)
        classes = list(self.model.classes_)
        proba = self.model.predict_proba(vec)[0]
        order = np.argsort(proba)[::-1]
        top = [
            {"shot": classes[i], "confidence": int(round(float(proba[i]) * 100))}
            for i in order
        ]
        predicted = top[0]["shot"]
        confidence = top[0]["confidence"]

        if low_signal:
            confidence = min(confidence, 45)
            top[0]["confidence"] = confidence
            indicators = ["Limited pose detected — try a clearer, side-on clip", "Result may be unreliable"]
        else:
            indicators = derive_indicators(metrics, predicted)

        return {
            "predictedShot": predicted,
            "confidence": confidence,
            "topPredictions": top,
            "detectedIndicators": indicators,
            "metrics": _coach_metrics(metrics),
            "poseFrames": int(seq.n_frames),
            "detectionRate": round(float(seq.detection_rate), 3),
        }

    def classify_url(self, url: str) -> dict:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            with requests.get(url, stream=True, timeout=30) as r:
                r.raise_for_status()
                with open(tmp_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        f.write(chunk)
            return self.classify_file(tmp_path)
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    def _vec_metrics(self, path: str):
        """Extract one clip to (vector, metrics, n_frames), releasing the heavy
        pose sequence immediately so a 2-clip compare peaks at ~single-clip
        memory (fits Render's 512MB free tier)."""
        feats, metrics, seq = self._features_for(path)
        vec = features_to_vector(feats)
        n = int(seq.n_frames)
        del seq, feats
        gc.collect()
        return vec, metrics, n

    # ── Two-clip comparison ────────────────────────────────────────────────
    def compare_files(self, path_a: str, path_b: str) -> dict:
        va, ma, frames_a = self._vec_metrics(path_a)
        vb, mb, frames_b = self._vec_metrics(path_b)

        # Similarity from the classifier's probability vectors — stable and
        # intuitive (same shot played similarly → high; different shots → low).
        pa = self.model.predict_proba([va])[0]
        pb = self.model.predict_proba([vb])[0]
        denom = (np.linalg.norm(pa) * np.linalg.norm(pb)) or 1.0
        cos = float(np.dot(pa, pb) / denom)  # proba >= 0 → cos in [0,1]
        similarity = int(round(max(0.0, min(1.0, cos)) * 100))

        shot_a = str(self.model.classes_[int(np.argmax(pa))])
        shot_b = str(self.model.classes_[int(np.argmax(pb))])

        # Markers that actually vary per clip (rotation saturates, so omit it).
        marker_defs = [
            ("Swing plane (vert/horiz)", "swing_ratio", ""),
            ("Front-knee bend", "knee_bend_min", "°"),
            ("Arm extension", "elbow_max", "°"),
        ]
        markers = []
        for label, key, unit in marker_defs:
            a = float(ma.get(key, 0.0))
            b = float(mb.get(key, 0.0))
            matched = abs(a - b) <= 0.18 * max(abs(a), abs(b), 1.0)
            markers.append({
                "label": label,
                "unit": unit,
                "valueA": round(a, 1),
                "valueB": round(b, 1),
                "matched": matched,
            })

        low = frames_a < MIN_FRAMES or frames_b < MIN_FRAMES

        return {
            "similarity": similarity if not low else min(similarity, 40),
            "shotA": shot_a,
            "shotB": shot_b,
            "markers": markers,
            "poseFramesA": frames_a,
            "poseFramesB": frames_b,
            "lowSignal": low,
        }
