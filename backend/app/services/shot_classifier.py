from typing import Dict, List

import numpy as np

from app.services.feature_service import sequence_features
from app.services.matching_service import vector_similarity
from app.services.pose_service import PoseFrame

class ShotClassifier:
    """Stage 1: classify shot mechanics before player matching."""

    def __init__(self, index: Dict) -> None:
        self.index = index

    def predict(self, frames: List[PoseFrame], mode: str = "batting") -> Dict:
        user_features = sequence_features(frames)
        scored = []
        for shot_slug, shot_data in self.index["shots"].items():
            canonical = shot_data.get("canonical")
            examples = [entry for entry in shot_data.get("entries", []) if entry.get("category", mode) == mode]
            if not examples:
                continue
            candidate_scores = []
            if canonical:
                candidate_scores.append(self._score_features(user_features, canonical["features"]))
            for entry in examples:
                candidate_scores.append(self._score_features(user_features, entry["features"]))
            if candidate_scores:
                scored.append((float(max(candidate_scores)), shot_slug))
        scored.sort(reverse=True)
        if not scored:
            return {"shot_type": "unknown", "shot_slug": "unknown", "confidence": 0.0, "top_shots": []}
        top = scored[0]
        return {
            "shot_type": top[1].replace("_", " "),
            "shot_slug": top[1],
            "confidence": round(top[0] * 100, 2),
            "top_shots": [
                {"shot_type": shot.replace("_", " "), "shot_slug": shot, "score": round(score * 100, 2)}
                for score, shot in scored[:3]
            ],
        }

    def _score_features(self, user: Dict, ref: Dict) -> float:
        seq = vector_similarity(np.array(user["sequence_embedding"], dtype=np.float32), np.array(ref["sequence_embedding"], dtype=np.float32))
        follow = vector_similarity(np.array(user["follow_through_embedding"], dtype=np.float32), np.array(ref["follow_through_embedding"], dtype=np.float32))
        motion = vector_similarity(np.array(user["motion_embedding"], dtype=np.float32), np.array(ref["motion_embedding"], dtype=np.float32))
        torso = vector_similarity(np.array(user["torso_embedding"], dtype=np.float32), np.array(ref["torso_embedding"], dtype=np.float32))
        return float(np.clip((0.30 * follow) + (0.28 * seq) + (0.24 * motion) + (0.18 * torso), 0.0, 1.0))
