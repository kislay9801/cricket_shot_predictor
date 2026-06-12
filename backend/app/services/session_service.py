import json
import uuid
from pathlib import Path
from typing import Dict

from app.core.config import SESSION_DIR


class SessionService:
    """Persists recent analysis results for dashboard refresh and report export."""

    def new_id(self) -> str:
        return uuid.uuid4().hex[:12]

    def save(self, session_id: str, payload: Dict) -> Path:
        SESSION_DIR.mkdir(parents=True, exist_ok=True)
        path = SESSION_DIR / f"{session_id}.json"
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        return path

    def latest(self) -> Dict:
        files = sorted(SESSION_DIR.glob("*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not files:
            raise FileNotFoundError("No analysis sessions found")
        return self.read(files[0].stem)

    def read(self, session_id: str) -> Dict:
        path = SESSION_DIR / f"{session_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Session {session_id} not found")
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
