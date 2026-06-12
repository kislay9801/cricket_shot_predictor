from typing import Dict, List

import numpy as np

from app.services.feature_service import sequence_features
from app.services.pose_service import PoseFrame


class ActionClassifier:
    """Classifies broad action family before shot/action matching."""

    def predict(self, frames: List[PoseFrame], mode_hint: str | None = None, available_categories: set[str] | None = None) -> Dict:
        features = sequence_features(frames)
        temporal = features["temporal_features"]
        wrist_horizontal = float(temporal.get("wrist_horizontal", 0.0))
        wrist_vertical = float(temporal.get("wrist_vertical", 0.0))
        shoulder_rotation = float(temporal.get("shoulder_rotation_range", 0.0))
        final_left_wrist_y = frames[-1].normalized[15][1] if frames else 0.0
        final_right_wrist_y = frames[-1].normalized[16][1] if frames else 0.0
        final_high_wrist = min(final_left_wrist_y, final_right_wrist_y)
        right_arm_elevation = frames[-1].normalized[16][1] - frames[-1].normalized[12][1] if frames else 0.0
        final_wrist_distance = (
            float(np.linalg.norm(np.array(frames[-1].normalized[15][:2]) - np.array(frames[-1].normalized[16][:2])))
            if frames
            else 99.0
        )
        hands_together = final_wrist_distance < 0.9

        bowling_score = 0.0
        if wrist_vertical > wrist_horizontal * 1.9 and not hands_together:
            bowling_score += 0.30
        if final_high_wrist < -0.65 and not hands_together:
            bowling_score += 0.25
        if abs(right_arm_elevation) > 0.75 and not hands_together:
            bowling_score += 0.20
        if shoulder_rotation > 45:
            bowling_score += 0.15

        batting_score = 0.0
        if wrist_horizontal >= wrist_vertical * 0.8:
            batting_score += 0.30
        if hands_together:
            batting_score += 0.35
        if final_high_wrist > -0.75:
            batting_score += 0.20
        if wrist_horizontal > 0.08:
            batting_score += 0.20
        if float(temporal.get("elbow_range", 0.0)) > 10:
            batting_score += 0.15

        predicted = "bowling" if bowling_score > batting_score else "batting"
        if available_categories and len(available_categories) == 1:
            predicted = next(iter(available_categories))
        confidence = max(bowling_score, batting_score) / max(bowling_score + batting_score, 1e-6)
        effective = mode_hint if mode_hint in {"batting", "bowling"} else predicted
        return {
            "action_type": effective,
            "predicted_action_type": predicted,
            "confidence": round(float(confidence) * 100, 2),
            "scores": {"batting": round(batting_score, 4), "bowling": round(bowling_score, 4)},
            "used_mode_hint": effective != predicted,
        }
