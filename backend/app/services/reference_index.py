import json
from pathlib import Path
from typing import Dict, List

from app.core.config import PLAYERS_DIR, SHOTS_DIR
from app.services.dataset_service import DatasetService
from app.services.feature_service import sequence_features
from app.services.pose_service import PoseFrame


class ReferenceIndex:
    """Loads the two-stage dataset: shots/* and players/*, with legacy fallback."""

    def __init__(self, shots_dir: Path = SHOTS_DIR, players_dir: Path = PLAYERS_DIR) -> None:
        self.shots_dir = shots_dir
        self.players_dir = players_dir
        self.legacy = DatasetService()
        self._cache: Dict | None = None

    def load(self) -> Dict:
        # References are static at runtime, so parse the (multi-MB) JSON once and
        # reuse it across requests instead of re-reading from disk every time.
        if self._cache is not None:
            return self._cache
        self._cache = self._build()
        return self._cache

    def _build(self) -> Dict:
        shots = self._load_shots()
        players = self._load_players()
        if shots:
            return {"shots": shots, "players": players, "source": "two_stage"}
        return self._legacy_index()

    def _load_shots(self) -> Dict[str, Dict]:
        shots: Dict[str, Dict] = {}
        if not self.shots_dir.exists():
            return shots
        for shot_dir in self.shots_dir.iterdir():
            if not shot_dir.is_dir():
                continue
            shot_name = shot_dir.name
            entries = []
            canonical = None
            for json_path in shot_dir.glob("*.json"):
                payload = self._read_json(json_path)
                payload["path"] = str(json_path)
                if json_path.stem == "canonical":
                    canonical = payload
                else:
                    entries.append(payload)
            if canonical or entries:
                shots[shot_name] = {"canonical": canonical, "entries": entries}
        return shots

    def _load_players(self) -> Dict[str, Dict]:
        players: Dict[str, Dict] = {}
        if not self.players_dir.exists():
            return players
        for player_dir in self.players_dir.iterdir():
            if not player_dir.is_dir():
                continue
            profile_path = player_dir / "style_profile.json"
            profile = self._read_json(profile_path) if profile_path.exists() else None
            shots = {}
            for json_path in player_dir.glob("*.json"):
                if json_path.name == "style_profile.json":
                    continue
                shots[json_path.stem] = self._read_json(json_path)
            players[player_dir.name] = {"profile": profile, "shots": shots}
        return players

    def _legacy_index(self) -> Dict:
        shots: Dict[str, Dict] = {}
        players: Dict[str, Dict] = {}
        for ref in self.legacy.load_references():
            shot_name = slug(ref["shot_type"])
            player_slug = slug(ref["player"])
            features = sequence_features(ref["frames"])
            entry = {
                "player": ref["player"],
                "player_slug": player_slug,
                "shot_type": ref["shot_type"],
                "shot_slug": shot_name,
                "category": ref["category"],
                "features": features,
                "frames": [frame.__dict__ for frame in ref["frames"]],
            }
            shots.setdefault(shot_name, {"canonical": None, "entries": []})["entries"].append(entry)
            players.setdefault(player_slug, {"profile": None, "shots": {}})["shots"][shot_name] = entry
        return {"shots": shots, "players": players, "source": "legacy"}

    @staticmethod
    def _read_json(path: Path) -> Dict:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)


def slug(value: str) -> str:
    return value.lower().strip().replace(" ", "_").replace("-", "_")
