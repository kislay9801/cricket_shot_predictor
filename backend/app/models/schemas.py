from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class WebcamFrameRequest(BaseModel):
    image_base64: str
    mode: str = "batting"
    session_id: Optional[str] = None


class MatchSummary(BaseModel):
    player: str
    category: str
    score: float
    shot_type: str


class AnalysisResult(BaseModel):
    session_id: str
    best_match: MatchSummary
    top_matches: List[MatchSummary]
    similarity_breakdown: Dict[str, float]
    coaching_feedback: List[str]
    similarity_graph: List[float]
    overlay_frames: List[str]
    fps: Optional[float] = None
    frame_count: int
    action_type: str = "unknown"
    action_prediction: Dict[str, Any] = {}
    shot_prediction: str
    shot_confidence: float = 0.0
    top_shots: List[Dict[str, Any]] = []
    report_url: str
    raw: Dict[str, Any] = {}
