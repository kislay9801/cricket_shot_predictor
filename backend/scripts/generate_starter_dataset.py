import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "dataset"

JOINTS = {
    "left_elbow": (11, 13, 15),
    "right_elbow": (12, 14, 16),
    "left_shoulder": (13, 11, 23),
    "right_shoulder": (14, 12, 24),
    "left_hip": (11, 23, 25),
    "right_hip": (12, 24, 26),
    "left_knee": (23, 25, 27),
    "right_knee": (24, 26, 28),
}


PLAYERS = [
    ("batting", "virat_kohli", "Virat Kohli", "cover drive", 0.82, -0.34, 0.18),
    ("batting", "rohit_sharma", "Rohit Sharma", "pull shot", 0.35, -0.88, 0.42),
    ("batting", "ab_de_villiers", "AB de Villiers", "360 scoop", 1.02, -0.72, -0.20),
    ("batting", "babar_azam", "Babar Azam", "cover drive", 0.70, -0.30, 0.12),
    ("batting", "steve_smith", "Steve Smith", "defensive shot", 0.18, 0.18, -0.08),
    ("batting", "joe_root", "Joe Root", "late cut", 0.44, -0.10, 0.04),
    ("batting", "kane_williamson", "Kane Williamson", "straight drive", 0.34, -0.42, 0.05),
    ("batting", "david_warner", "David Warner", "pull shot", 0.58, -0.78, 0.52),
    ("batting", "ms_dhoni", "MS Dhoni", "helicopter shot", 0.96, -0.18, 0.36),
    ("bowling", "bumrah", "Jasprit Bumrah", "yorker action", 0.18, -1.06, 0.64),
    ("bowling", "malinga", "Lasith Malinga", "sling action", 1.18, -0.58, 0.88),
    ("bowling", "shami", "Mohammed Shami", "seam release", 0.46, -1.18, 0.22),
    ("bowling", "ashwin", "R Ashwin", "off-spin action", 0.22, -0.56, -0.20),
    ("bowling", "starc", "Mitchell Starc", "left-arm pace", -0.36, -1.10, 0.48),
    ("bowling", "boult", "Trent Boult", "left-arm swing", -0.28, -0.94, 0.36),
]


def sub(a: List[float], b: List[float]) -> List[float]:
    return [a[i] - b[i] for i in range(3)]


def norm(a: List[float]) -> float:
    return math.sqrt(sum(value * value for value in a))


def angle_between(a: List[float], b: List[float], c: List[float]) -> float:
    ba = sub(a, b)
    bc = sub(c, b)
    denom = norm(ba) * norm(bc)
    if denom < 1e-8:
        return 0.0
    cosine = max(min(sum(ba[i] * bc[i] for i in range(3)) / denom, 1.0), -1.0)
    return float(math.degrees(math.acos(cosine)))


def midpoint(a: List[float], b: List[float]) -> List[float]:
    return [(a[i] + b[i]) / 2.0 for i in range(3)]


def normalize(points: List[List[float]]) -> List[List[float]]:
    hips = midpoint(points[23], points[24])
    shoulders = midpoint(points[11], points[12])
    torso = max(norm(sub(shoulders, hips)), 1e-6)
    normalized = []
    for point in points:
        coords = [(point[i] - hips[i]) / torso for i in range(3)]
        normalized.append([round(coords[0], 5), round(coords[1], 5), round(coords[2], 5), round(point[3], 5)])
    return normalized


def angles(normalized: List[List[float]]) -> Dict[str, float]:
    return {name: round(angle_between(normalized[a], normalized[b], normalized[c]), 3) for name, (a, b, c) in JOINTS.items()}


def embedding(normalized: List[List[float]], angle_map: Dict[str, float]) -> List[float]:
    keypoints = []
    for index in [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]:
        keypoints.extend(normalized[index][:3])
    angle_vec = [round(angle_map[name] / 180.0, 5) for name in JOINTS]
    torso_map = torso_features(normalized)
    torso_vec = [
        round(torso_map["shoulder_line_angle"] / 180.0, 5),
        round(torso_map["hip_line_angle"] / 180.0, 5),
        round(torso_map["hip_shoulder_separation"] / 180.0, 5),
    ]
    bat_vec = [0.0, 0.0, 0.0]
    visibility = [normalized[index][3] for index in [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]]
    return [round(value, 5) for value in keypoints + angle_vec + torso_vec + bat_vec + visibility]


def line_angle(a: List[float], b: List[float]) -> float:
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def wrapped_delta(a: float, b: float) -> float:
    return (a - b + 180.0) % 360.0 - 180.0


def torso_features(normalized: List[List[float]]) -> Dict[str, float]:
    shoulder_angle = line_angle(normalized[11], normalized[12])
    hip_angle = line_angle(normalized[23], normalized[24])
    return {
        "shoulder_line_angle": round(shoulder_angle, 3),
        "hip_line_angle": round(hip_angle, 3),
        "hip_shoulder_separation": round(wrapped_delta(shoulder_angle, hip_angle), 3),
    }


def base_body() -> List[List[float]]:
    pts = [[0.0, 0.0, 0.0, 0.95] for _ in range(33)]
    pts[11] = [-0.36, -0.90, 0.0, 0.99]
    pts[12] = [0.36, -0.90, 0.0, 0.99]
    pts[23] = [-0.25, 0.0, 0.0, 0.99]
    pts[24] = [0.25, 0.0, 0.0, 0.99]
    pts[13] = [-0.62, -0.48, 0.0, 0.98]
    pts[14] = [0.62, -0.48, 0.0, 0.98]
    pts[15] = [-0.76, -0.10, 0.0, 0.98]
    pts[16] = [0.76, -0.10, 0.0, 0.98]
    pts[25] = [-0.28, 0.68, 0.0, 0.98]
    pts[26] = [0.28, 0.68, 0.0, 0.98]
    pts[27] = [-0.30, 1.35, 0.0, 0.97]
    pts[28] = [0.30, 1.35, 0.0, 0.97]
    pts[0] = [0.0, -1.45, 0.0, 0.96]
    return pts


def make_sequence(wrist_x: float, wrist_y: float, lean: float, category: str, shot_type: str) -> List[Dict]:
    frames = []
    for i in range(28):
        t = i / 27.0
        pts = base_body()
        sweep = math.sin(t * math.pi)
        pts[11][0] += lean * 0.10
        pts[12][0] += lean * 0.10
        pts[23][0] += lean * 0.05
        pts[24][0] += lean * 0.05

        if category == "batting":
            if "defensive" in shot_type:
                sweep = math.sin(t * math.pi) * 0.42
                wrist_x *= 0.24
                wrist_y = abs(wrist_y) * 0.35
                lean *= 0.35
            elif "pull" in shot_type:
                sweep = min(1.0, t * 1.45)
                pts[11][0] += 0.18 * sweep
                pts[12][0] += 0.30 * sweep
                pts[23][0] -= 0.06 * sweep
                pts[24][0] += 0.10 * sweep
            elif "straight" in shot_type:
                wrist_x *= 0.42
                wrist_y *= 1.25
            elif "helicopter" in shot_type:
                sweep = math.sin(t * math.pi) + 0.35 * math.sin(t * math.pi * 2)
            pts[13] = [-0.54 + wrist_x * 0.16 * sweep, -0.50 + wrist_y * 0.08 * sweep, 0.04 * lean, 0.98]
            pts[15] = [-0.70 + wrist_x * 0.40 * sweep, -0.20 + wrist_y * 0.36 * sweep, 0.08 * lean, 0.98]
            pts[14] = [0.50 + wrist_x * 0.08 * sweep, -0.50 + wrist_y * 0.04 * sweep, 0.0, 0.98]
            pts[16] = [0.72 + wrist_x * 0.26 * sweep, -0.18 + wrist_y * 0.22 * sweep, 0.02, 0.98]
            pts[25][0] -= 0.08 * sweep
            pts[27][0] -= 0.12 * sweep
        else:
            if "spin" in shot_type:
                wrist_y *= 0.62
                wrist_x *= 1.35
                lean *= 0.55
            elif "left-arm" in shot_type:
                wrist_x = -abs(wrist_x)
            pts[14] = [0.34 + wrist_x * 0.20 * sweep, -0.86 + wrist_y * 0.18 * sweep, 0.08, 0.98]
            pts[16] = [0.26 + wrist_x * 0.46 * sweep, -1.10 + wrist_y * 0.44 * sweep, 0.12, 0.98]
            pts[13] = [-0.50 - 0.12 * sweep, -0.46, -0.02, 0.98]
            pts[15] = [-0.70 - 0.16 * sweep, -0.18 + 0.18 * sweep, -0.02, 0.98]
            pts[25][1] -= 0.14 * sweep
            pts[27][0] += 0.18 * sweep

        normalized = normalize(pts)
        angle_map = angles(normalized)
        torso_map = torso_features(normalized)
        frames.append(
            {
                "landmarks": normalized,
                "normalized": normalized,
                "angles": angle_map,
                "torso": torso_map,
                "bat": {"angle": 0.0, "length": 0.0, "confidence": 0.0, "x1": 0.0, "y1": 0.0, "x2": 0.0, "y2": 0.0},
                "embedding": embedding(normalized, angle_map),
                "confidence": 0.96,
            }
        )
    return frames


def main() -> None:
    for category, folder, player, shot_type, wrist_x, wrist_y, lean in PLAYERS:
        out_dir = DATASET / category / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "player": player,
            "category": category,
            "shot_type": shot_type,
            "style_notes": {
                "source": "synthetic starter landmarks",
                "purpose": "MVP bootstrapping; replace or augment with real extracted clips for production accuracy",
            },
            "frames": make_sequence(wrist_x, wrist_y, lean, category, shot_type),
        }
        with (out_dir / "landmarks.json").open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        (out_dir / "README.md").write_text(
            "Add real MP4 reference clips here, then run backend/scripts/extract_reference.py to regenerate landmarks.json.\n",
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
