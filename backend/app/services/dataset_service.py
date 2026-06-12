import json
from pathlib import Path
from typing import Dict, List

from app.core.config import DATASET_DIR, REFERENCE_FILE
from app.services.pose_service import PoseFrame
from app.services.pose_service import build_embedding, empty_bat_features, torso_features


def pose_frame_from_dict(item: Dict) -> PoseFrame:
    torso = item.get("torso") or torso_features(item["normalized"])
    bat = item.get("bat") or empty_bat_features()
    embedding = build_embedding(item["normalized"], item["angles"], torso, bat)
    return PoseFrame(
        landmarks=item.get("landmarks", item["normalized"]),
        normalized=item["normalized"],
        angles=item["angles"],
        torso=torso,
        bat=bat,
        embedding=embedding,
        confidence=float(item.get("confidence", 1.0)),
    )


class DatasetService:
    """Loads starter/player references from dataset/*/*/landmarks.json."""

    def __init__(self, dataset_dir: Path = DATASET_DIR) -> None:
        self.dataset_dir = dataset_dir

    def load_references(self) -> List[Dict]:
        references: List[Dict] = []
        for file_path in self.dataset_dir.glob(f"*/*/{REFERENCE_FILE}"):
            with file_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            frames = [pose_frame_from_dict(frame) for frame in payload["frames"]]
            references.append(
                {
                    "player": payload["player"],
                    "category": payload["category"],
                    "shot_type": payload.get("shot_type", "unknown"),
                    "style_notes": payload.get("style_notes", {}),
                    "frames": frames,
                    "path": str(file_path),
                }
            )
        return references
