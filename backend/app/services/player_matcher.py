from typing import Dict, List

import numpy as np

from app.core.config import CONFIDENCE_THRESHOLD
from app.services.feature_service import sequence_features
from app.services.matching_service import (
    coaching_feedback,
    dtw_sequence_similarity,
    phase_similarity,
    similarity_breakdown,
    torso_rotation_signature,
    vector_similarity,
)
from app.services.pose_service import PoseFrame
from app.services.dataset_service import pose_frame_from_dict


class PlayerMatcher:
    """Stage 2: match player style only inside the predicted shot bucket."""

    def __init__(self, index: Dict) -> None:
        self.index = index

    def match(self, frames: List[PoseFrame], shot_slug: str, mode: str = "batting") -> Dict:
        user_features = sequence_features(frames)
        entries = [
            entry
            for entry in self.index["shots"].get(shot_slug, {}).get("entries", [])
            if entry.get("category", mode) == mode
        ]
        scored = []
        graph_by_player = {}
        for entry in entries:
            ref_frames = [pose_frame_from_dict(frame) for frame in entry.get("frames", [])]
            if not ref_frames:
                continue
            score, graph = self._score_entry(frames, user_features, ref_frames, entry["features"])
            graph_by_player[entry["player"]] = graph
            scored.append((score, entry, ref_frames))
        scored.sort(key=lambda item: item[0], reverse=True)
        if not scored:
            return self._no_match("No references available for this shot yet.", shot_slug)
        if all(entry.get("source_kind") == "shot_only" for _, entry, _ in scored):
            best_score, best_entry, best_frames = scored[0]
            shot_name = shot_slug.replace("_", " ")
            return {
                "best_match": {
                    "player": f"Closest {shot_name} reference",
                    "category": best_entry.get("category", "batting"),
                    "score": round(best_score * 100, 2),
                    "shot_type": shot_name,
                },
                # Rank the closest reference clips so the user sees how well they
                # matched the best examples of this shot.
                "top_matches": [
                    {
                        "player": f"Reference {i + 1}",
                        "category": entry.get("category", "batting"),
                        "score": round(score * 100, 2),
                        "shot_type": entry["shot_type"],
                    }
                    for i, (score, entry, _) in enumerate(scored[:3])
                ],
                "similarity_breakdown": {key: round(value * 100, 2) for key, value in similarity_breakdown(frames, best_frames).items()},
                "coaching_feedback": coaching_feedback(frames, best_frames, f"the ideal {shot_name}"),
                "similarity_graph": [round(value * 100, 2) for value in graph_by_player.get(best_entry["player"], [])],
            }

        best_score, best_entry, best_frames = scored[0]
        confident = best_score >= CONFIDENCE_THRESHOLD
        best_match = {
            "player": best_entry["player"] if confident else "No confident match",
            "category": best_entry.get("category", "batting"),
            "score": round(best_score * 100, 2),
            "shot_type": best_entry["shot_type"],
        }
        top_matches = [
            {
                "player": entry["player"],
                "category": entry.get("category", "batting"),
                "score": round(score * 100, 2),
                "shot_type": entry["shot_type"],
            }
            for score, entry, _ in scored[:3]
        ]
        return {
            "best_match": best_match,
            "top_matches": top_matches,
            "similarity_breakdown": {key: round(value * 100, 2) for key, value in similarity_breakdown(frames, best_frames).items()},
            "coaching_feedback": coaching_feedback(frames, best_frames, best_entry["player"]),
            "similarity_graph": [round(value * 100, 2) for value in graph_by_player.get(best_entry["player"], [])],
        }

    def _score_entry(self, user_frames: List[PoseFrame], user_features: Dict, ref_frames: List[PoseFrame], ref_features: Dict):
        follow = vector_similarity(np.array(user_features["follow_through_embedding"], dtype=np.float32), np.array(ref_features["follow_through_embedding"], dtype=np.float32))
        dtw, graph = dtw_sequence_similarity(user_frames, ref_frames)
        phase = phase_similarity(user_frames, ref_frames)[0]
        torso_motion = vector_similarity(torso_rotation_signature(user_frames), torso_rotation_signature(ref_frames))
        motion = vector_similarity(np.array(user_features["motion_embedding"], dtype=np.float32), np.array(ref_features["motion_embedding"], dtype=np.float32))
        score = (0.35 * follow) + (0.25 * dtw) + (0.20 * phase) + (0.20 * ((torso_motion + motion) / 2.0))
        return float(np.clip(score, 0.0, 1.0)), graph

    def _no_match(self, reason: str, shot_slug: str) -> Dict:
        return {
            "best_match": {"player": "No confident match", "category": "unknown", "score": 0.0, "shot_type": shot_slug.replace("_", " ")},
            "top_matches": [],
            "similarity_breakdown": {},
            "coaching_feedback": [reason],
            "similarity_graph": [],
        }
