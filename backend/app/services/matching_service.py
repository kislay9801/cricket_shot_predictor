from typing import Dict, List, Tuple

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.services.pose_service import JOINTS, PoseFrame, angle_delta, wrist_trajectory


ANGLE_GROUPS = {
    "elbow": ["left_elbow", "right_elbow"],
    "shoulder": ["left_shoulder", "right_shoulder"],
    "hip": ["left_hip", "right_hip"],
    "knee": ["left_knee", "right_knee"],
}

MOTION_LANDMARKS = [11, 12, 13, 14, 15, 16]
PHASE_WEIGHTS = {
    "stance": 0.12,
    "backswing": 0.22,
    "impact": 0.36,
    "follow_through": 0.30,
}


class MatchingService:
    """Compares user pose sequences against reference cricket actions."""

    def __init__(self, references: List[Dict]) -> None:
        self.references = references

    def rank(self, user_frames: List[PoseFrame], mode: str = "batting") -> Dict:
        if not user_frames:
            raise ValueError("No pose landmarks detected. Try a clearer full-body clip.")

        candidates = [ref for ref in self.references if ref["category"] == mode] or self.references
        scored = []
        graph_by_player: Dict[str, List[float]] = {}

        for ref in candidates:
            score, frame_scores = sequence_similarity(user_frames, ref["frames"])
            breakdown = similarity_breakdown(user_frames, ref["frames"])
            scored.append((score, ref, breakdown))
            graph_by_player[ref["player"]] = frame_scores

        scored.sort(key=lambda item: item[0], reverse=True)
        best_score, best_ref, breakdown = scored[0]
        top_matches = [
            {
                "player": ref["player"],
                "category": ref["category"],
                "score": round(score * 100, 2),
                "shot_type": ref["shot_type"],
            }
            for score, ref, _ in scored[:3]
        ]

        return {
            "best_match": top_matches[0],
            "top_matches": top_matches,
            "similarity_breakdown": {key: round(value * 100, 2) for key, value in breakdown.items()},
            "coaching_feedback": coaching_feedback(user_frames, best_ref["frames"], best_ref["player"]),
            "similarity_graph": [round(value * 100, 2) for value in graph_by_player[best_ref["player"]]],
            "shot_prediction": self.predict_shot_type(user_frames),
        }

    def predict_shot_type(self, frames: List[PoseFrame]) -> str:
        return classify_shot_from_temporal_features(build_temporal_shot_features(frames))


def sequence_embedding(frames: List[PoseFrame]) -> np.ndarray:
    embeddings = np.array([frame.embedding for frame in frames], dtype=np.float32)
    angles = np.array([[frame.angles[name] / 180.0 for name in JOINTS] for frame in frames], dtype=np.float32)
    wrist = np.array(wrist_trajectory(frames), dtype=np.float32)
    return np.concatenate(
        [
            embeddings.mean(axis=0),
            embeddings.std(axis=0),
            angles.mean(axis=0),
            motion_signature(frames),
            angle_change_signature(frames),
            torso_rotation_signature(frames),
            bat_signature(frames),
            wrist,
        ]
    )


def resample_frames(frames: List[PoseFrame], count: int) -> List[PoseFrame]:
    if len(frames) == count:
        return frames
    if len(frames) == 1:
        return frames * count
    indices = np.linspace(0, len(frames) - 1, count).round().astype(int)
    return [frames[int(index)] for index in indices]


def frame_similarity(a: PoseFrame, b: PoseFrame) -> float:
    emb_a = np.array(a.embedding, dtype=np.float32).reshape(1, -1)
    emb_b = np.array(b.embedding, dtype=np.float32).reshape(1, -1)
    cosine = float(cosine_similarity(emb_a, emb_b)[0][0])
    angle_diffs = np.array([abs(a.angles[name] - b.angles[name]) for name in JOINTS], dtype=np.float32)
    angle_score = 1.0 - min(float(angle_diffs.mean()) / 120.0, 1.0)
    return float(np.clip((0.62 * ((cosine + 1.0) / 2.0)) + (0.38 * angle_score), 0.0, 1.0))


def sequence_similarity(user_frames: List[PoseFrame], ref_frames: List[PoseFrame]) -> Tuple[float, List[float]]:
    phase_score, phase_scores = phase_similarity(user_frames, ref_frames)
    dtw_score, dtw_scores = dtw_sequence_similarity(user_frames, ref_frames)
    motion_score = vector_similarity(motion_signature(user_frames), motion_signature(ref_frames))
    angle_change_score = vector_similarity(angle_change_signature(user_frames), angle_change_signature(ref_frames))
    torso_score = vector_similarity(torso_rotation_signature(user_frames), torso_rotation_signature(ref_frames))
    bat_score = bat_trajectory_similarity(user_frames, ref_frames)
    total = (
        0.34 * phase_score
        + 0.22 * dtw_score
        + 0.16 * motion_score
        + 0.13 * angle_change_score
        + 0.10 * torso_score
        + 0.05 * bat_score
    )
    graph_scores = dtw_scores if len(dtw_scores) >= len(phase_scores) else phase_scores
    return float(np.clip(total, 0.0, 1.0)), graph_scores


def similarity_breakdown(user_frames: List[PoseFrame], ref_frames: List[PoseFrame]) -> Dict[str, float]:
    count = min(max(len(user_frames), len(ref_frames)), 48)
    aligned_user = resample_frames(user_frames, count)
    aligned_ref = resample_frames(ref_frames, count)
    result: Dict[str, float] = {}
    for group, names in ANGLE_GROUPS.items():
        diffs = []
        for user, ref in zip(aligned_user, aligned_ref):
            diffs.extend(abs(user.angles[name] - ref.angles[name]) for name in names)
        result[group] = 1.0 - min(float(np.mean(diffs)) / 120.0, 1.0)
    trajectory_distance = np.linalg.norm(np.array(wrist_trajectory(user_frames)) - np.array(wrist_trajectory(ref_frames)))
    result["wrist_trajectory"] = 1.0 / (1.0 + float(trajectory_distance))
    result["phase_alignment"] = phase_similarity(user_frames, ref_frames)[0]
    result["dtw_alignment"] = dtw_sequence_similarity(user_frames, ref_frames)[0]
    result["motion_direction"] = vector_similarity(motion_signature(user_frames), motion_signature(ref_frames))
    result["angle_change"] = vector_similarity(angle_change_signature(user_frames), angle_change_signature(ref_frames))
    result["torso_rotation"] = vector_similarity(torso_rotation_signature(user_frames), torso_rotation_signature(ref_frames))
    result["bat_trajectory"] = bat_trajectory_similarity(user_frames, ref_frames)
    return result


def dtw_sequence_similarity(user_frames: List[PoseFrame], ref_frames: List[PoseFrame]) -> Tuple[float, List[float]]:
    """Align actions with Dynamic Time Warping instead of forcing linear frame resampling."""
    n, m = len(user_frames), len(ref_frames)
    if n == 0 or m == 0:
        return 0.0, []
    cost = np.full((n + 1, m + 1), np.inf, dtype=np.float32)
    cost[0, 0] = 0.0
    sim_cache = np.zeros((n, m), dtype=np.float32)
    for i in range(n):
        for j in range(m):
            sim = frame_similarity(user_frames[i], ref_frames[j])
            sim_cache[i, j] = sim
            distance = 1.0 - sim
            cost[i + 1, j + 1] = distance + min(cost[i, j + 1], cost[i + 1, j], cost[i, j])

    i, j = n, m
    path = []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        choices = [cost[i - 1, j - 1], cost[i - 1, j], cost[i, j - 1]]
        step = int(np.argmin(choices))
        if step == 0:
            i -= 1
            j -= 1
        elif step == 1:
            i -= 1
        else:
            j -= 1
    path.reverse()
    scores = [float(sim_cache[i, j]) for i, j in path]
    return float(np.mean(scores)) if scores else 0.0, scores


def phase_similarity(user_frames: List[PoseFrame], ref_frames: List[PoseFrame]) -> Tuple[float, List[float]]:
    user_phases = detect_shot_phases(user_frames)
    ref_phases = detect_shot_phases(ref_frames)
    scores = []
    weighted = []
    for phase, weight in PHASE_WEIGHTS.items():
        user_index = user_phases[phase]
        ref_index = ref_phases[phase]
        score = frame_similarity(user_frames[user_index], ref_frames[ref_index])
        scores.append(score)
        weighted.append(weight * score)
    return float(np.clip(sum(weighted), 0.0, 1.0)), scores


def detect_shot_phases(frames: List[PoseFrame]) -> Dict[str, int]:
    if len(frames) == 1:
        return {phase: 0 for phase in PHASE_WEIGHTS}
    acceleration = joint_angle_acceleration(frames)
    if len(acceleration):
        start = max(1, int(len(acceleration) * 0.15))
        end = max(start + 1, int(len(acceleration) * 0.88))
        impact = int(np.argmax(acceleration[start:end]) + start + 2)
    else:
        speeds = frame_motion_speeds(frames)
        impact = int(np.argmax(speeds) + 1) if len(speeds) else len(frames) // 2
    impact = int(np.clip(impact, 1, len(frames) - 1))
    velocity = joint_angle_velocity(frames)
    if len(velocity) and impact > 2:
        backswing_window = velocity[: max(1, impact - 1)]
        backswing = int(np.argmax(backswing_window) + 1)
    else:
        backswing = max(1, impact // 2)
    follow = min(len(frames) - 1, impact + max(1, (len(frames) - impact) // 2))
    return {
        "stance": 0,
        "backswing": backswing,
        "impact": impact,
        "follow_through": follow,
    }


def joint_angle_velocity(frames: List[PoseFrame]) -> np.ndarray:
    if len(frames) < 2:
        return np.array([], dtype=np.float32)
    angle_matrix = np.array([[frame.angles[name] for name in JOINTS] for frame in frames], dtype=np.float32)
    return np.linalg.norm(np.diff(angle_matrix, axis=0), axis=1)


def joint_angle_acceleration(frames: List[PoseFrame]) -> np.ndarray:
    velocity = joint_angle_velocity(frames)
    if len(velocity) < 2:
        return np.array([], dtype=np.float32)
    return np.abs(np.diff(velocity))


def frame_motion_speeds(frames: List[PoseFrame]) -> np.ndarray:
    velocities = landmark_velocities(frames)
    if len(velocities) == 0:
        return np.array([], dtype=np.float32)
    return np.linalg.norm(velocities[:, [4, 5], :2], axis=2).mean(axis=1)


def landmark_velocities(frames: List[PoseFrame]) -> np.ndarray:
    if len(frames) < 2:
        return np.zeros((0, len(MOTION_LANDMARKS), 3), dtype=np.float32)
    points = np.array(
        [[[frame.normalized[index][axis] for axis in range(3)] for index in MOTION_LANDMARKS] for frame in frames],
        dtype=np.float32,
    )
    return np.diff(points, axis=0)


def motion_signature(frames: List[PoseFrame]) -> np.ndarray:
    velocities = landmark_velocities(frames)
    if len(velocities) == 0:
        return np.zeros(len(MOTION_LANDMARKS) * 6, dtype=np.float32)
    mean_velocity = velocities.mean(axis=0).flatten()
    peak_velocity = velocities[np.argmax(np.linalg.norm(velocities[:, [4, 5], :2], axis=2).mean(axis=1))].flatten()
    return np.concatenate([mean_velocity, peak_velocity]).astype(np.float32)


def angle_change_signature(frames: List[PoseFrame]) -> np.ndarray:
    if len(frames) < 2:
        return np.zeros(len(JOINTS) * 2, dtype=np.float32)
    angle_matrix = np.array([[frame.angles[name] for name in JOINTS] for frame in frames], dtype=np.float32)
    deltas = np.diff(angle_matrix, axis=0) / 180.0
    return np.concatenate([deltas.mean(axis=0), np.max(np.abs(deltas), axis=0)]).astype(np.float32)


def torso_rotation_signature(frames: List[PoseFrame]) -> np.ndarray:
    if len(frames) < 2:
        current = frames[0].torso if frames else {"shoulder_line_angle": 0.0, "hip_line_angle": 0.0, "hip_shoulder_separation": 0.0}
        return np.array(
            [
                current["shoulder_line_angle"] / 180.0,
                current["hip_line_angle"] / 180.0,
                current["hip_shoulder_separation"] / 180.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
            ],
            dtype=np.float32,
        )
    torso = np.array(
        [
            [frame.torso["shoulder_line_angle"], frame.torso["hip_line_angle"], frame.torso["hip_shoulder_separation"]]
            for frame in frames
        ],
        dtype=np.float32,
    )
    deltas = np.diff(torso, axis=0) / 180.0
    return np.concatenate([torso.mean(axis=0) / 180.0, deltas.mean(axis=0), np.max(np.abs(deltas), axis=0)]).astype(np.float32)


def bat_signature(frames: List[PoseFrame]) -> np.ndarray:
    if not frames:
        return np.zeros(6, dtype=np.float32)
    angles = np.array([frame.bat.get("angle", 0.0) for frame in frames], dtype=np.float32)
    confidence = np.array([frame.bat.get("confidence", 0.0) for frame in frames], dtype=np.float32)
    lengths = np.array([frame.bat.get("length", 0.0) for frame in frames], dtype=np.float32)
    valid = confidence > 0.0
    if not np.any(valid):
        return np.zeros(6, dtype=np.float32)
    valid_angles = angles[valid]
    angle_change = float(angle_delta(valid_angles[-1], valid_angles[0])) / 180.0 if len(valid_angles) > 1 else 0.0
    swing_speed = float(np.mean(np.abs(np.diff(valid_angles)))) / 180.0 if len(valid_angles) > 1 else 0.0
    return np.array(
        [
            float(np.mean(valid_angles)) / 180.0,
            angle_change,
            swing_speed,
            float(np.mean(lengths[valid])),
            float(np.mean(confidence)),
            float(np.max(confidence)),
        ],
        dtype=np.float32,
    )


def bat_trajectory_similarity(user_frames: List[PoseFrame], ref_frames: List[PoseFrame]) -> float:
    user_conf = float(np.mean([frame.bat.get("confidence", 0.0) for frame in user_frames])) if user_frames else 0.0
    ref_conf = float(np.mean([frame.bat.get("confidence", 0.0) for frame in ref_frames])) if ref_frames else 0.0
    if user_conf == 0.0 and ref_conf == 0.0:
        return 0.72
    return vector_similarity(bat_signature(user_frames), bat_signature(ref_frames))


def build_temporal_shot_features(frames: List[PoseFrame]) -> Dict[str, float | str]:
    """Sequence-level cricket features for shot classification."""
    if not frames:
        return {"shot_family": "unknown"}

    wrists = np.array(
        [[frame.normalized[15][0], frame.normalized[15][1], frame.normalized[16][0], frame.normalized[16][1]] for frame in frames],
        dtype=np.float32,
    )
    left_wrist_delta = wrists[-1, :2] - wrists[0, :2]
    right_wrist_delta = wrists[-1, 2:] - wrists[0, 2:]
    wrist_delta = (left_wrist_delta + right_wrist_delta) / 2.0
    left_range = np.ptp(wrists[:, :2], axis=0)
    right_range = np.ptp(wrists[:, 2:], axis=0)
    wrist_range = (left_range + right_range) / 2.0
    wrist_path = wrists[:, [0, 1, 2, 3]]
    wrist_speed = float(np.mean(np.linalg.norm(np.diff(wrist_path, axis=0), axis=1))) if len(frames) > 1 else 0.0
    horizontal = abs(float(wrist_range[0]))
    vertical = abs(float(wrist_range[1]))
    if horizontal > vertical * 1.35:
        arc_direction = "horizontal"
    elif vertical > horizontal * 1.35:
        arc_direction = "vertical"
    else:
        arc_direction = "diagonal"

    angle_matrix = np.array([[frame.angles[name] for name in JOINTS] for frame in frames], dtype=np.float32)
    angle_deltas = np.diff(angle_matrix, axis=0) if len(frames) > 1 else np.zeros((1, len(JOINTS)), dtype=np.float32)
    angle_velocity_peak = float(np.max(np.abs(angle_deltas))) if angle_deltas.size else 0.0
    elbow_indices = [list(JOINTS.keys()).index("left_elbow"), list(JOINTS.keys()).index("right_elbow")]
    elbow_range = float(np.max(np.ptp(angle_matrix[:, elbow_indices], axis=0))) if len(frames) > 1 else 0.0

    torso_values = np.array(
        [[frame.torso["shoulder_line_angle"], frame.torso["hip_line_angle"], frame.torso["hip_shoulder_separation"]] for frame in frames],
        dtype=np.float32,
    )
    shoulder_rotation_range = circular_range(torso_values[:, 0])
    hip_rotation_range = circular_range(torso_values[:, 1])
    separation_peak = float(np.max(np.abs(torso_values[:, 2]))) if len(frames) else 0.0

    left_ankle = np.array([[frame.normalized[27][0], frame.normalized[27][1]] for frame in frames], dtype=np.float32)
    right_ankle = np.array([[frame.normalized[28][0], frame.normalized[28][1]] for frame in frames], dtype=np.float32)
    ankle_mid = (left_ankle + right_ankle) / 2.0
    weight_transfer_x = float(ankle_mid[-1, 0] - ankle_mid[0, 0]) if len(frames) > 1 else 0.0
    front_foot_extension = float(max(abs(left_ankle[-1, 0] - left_ankle[0, 0]), abs(right_ankle[-1, 0] - right_ankle[0, 0]))) if len(frames) > 1 else 0.0

    bat = bat_signature(frames)
    return {
        "wrist_arc_direction": arc_direction,
        "wrist_horizontal": horizontal,
        "wrist_vertical": vertical,
        "wrist_end_horizontal": abs(float(wrist_delta[0])),
        "wrist_end_vertical": abs(float(wrist_delta[1])),
        "wrist_speed": wrist_speed,
        "angle_velocity_peak": angle_velocity_peak,
        "elbow_range": elbow_range,
        "shoulder_rotation_range": shoulder_rotation_range,
        "hip_rotation_range": hip_rotation_range,
        "hip_shoulder_separation_peak": separation_peak,
        "weight_transfer_x": weight_transfer_x,
        "front_foot_extension": front_foot_extension,
        "bat_swing_speed": float(bat[2]),
        "bat_confidence": float(bat[4]),
    }


def classify_shot_from_temporal_features(features: Dict[str, float | str]) -> str:
    arc = str(features.get("wrist_arc_direction", "unknown"))
    hip_rotation = float(features.get("hip_rotation_range", 0.0))
    shoulder_rotation = float(features.get("shoulder_rotation_range", 0.0))
    elbow_range = float(features.get("elbow_range", 0.0))
    wrist_speed = float(features.get("wrist_speed", 0.0))
    weight_transfer = float(features.get("weight_transfer_x", 0.0))
    front_foot_extension = float(features.get("front_foot_extension", 0.0))
    angle_velocity = float(features.get("angle_velocity_peak", 0.0))
    wrist_horizontal = float(features.get("wrist_horizontal", 0.0))
    wrist_vertical = float(features.get("wrist_vertical", 0.0))

    if wrist_speed < 0.008 and elbow_range < 18:
        return "defensive shot"
    if arc == "vertical" and hip_rotation < 25 and elbow_range < 28 and angle_velocity < 16:
        return "defensive shot"
    if wrist_horizontal > 0.34 and wrist_vertical > 0.18:
        return "360 scoop"
    if wrist_horizontal > 0.34 and wrist_vertical < 0.10 and elbow_range > 20:
        return "helicopter shot"
    if arc == "vertical" and wrist_speed > 0.030 and wrist_vertical > wrist_horizontal * 2.0:
        return "straight drive"
    if elbow_range > 48 and wrist_speed > 0.010:
        return "pull shot"
    if arc == "diagonal" and front_foot_extension > 0.035 and hip_rotation >= 18:
        return "cover drive"
    if wrist_horizontal > 0.18 and wrist_vertical > 0.07 and elbow_range <= 35:
        return "cover drive"
    if arc == "horizontal" and wrist_vertical < 0.06 and elbow_range < 12:
        return "late cut"
    if arc == "horizontal" and wrist_speed > 0.010 and elbow_range > 12:
        return "pull shot"
    if weight_transfer < -0.04 and elbow_range < 35:
        return "back-foot defense"
    if shoulder_rotation > 55 and angle_velocity > 22:
        return "aggressive cross-bat shot"
    return "controlled cricket shot"


def circular_range(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    radians = np.deg2rad(values)
    unwrapped = np.rad2deg(np.unwrap(radians))
    return float(np.max(unwrapped) - np.min(unwrapped))


def vector_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return 0.0
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom < 1e-8:
        distance = float(np.linalg.norm(a - b))
        return 1.0 / (1.0 + distance)
    cosine = float(np.dot(a, b) / denom)
    distance = float(np.linalg.norm(a - b))
    return float(np.clip((0.72 * ((cosine + 1.0) / 2.0)) + (0.28 / (1.0 + distance)), 0.0, 1.0))


def coaching_feedback(user_frames: List[PoseFrame], ref_frames: List[PoseFrame], player: str) -> List[str]:
    tips = []
    readable = {
        "left_elbow": "front elbow",
        "right_elbow": "back elbow",
        "left_shoulder": "front shoulder",
        "right_shoulder": "back shoulder",
        "left_knee": "front knee",
        "right_knee": "back knee",
    }
    user_phases = detect_shot_phases(user_frames)
    ref_phases = detect_shot_phases(ref_frames)
    for phase in ["stance", "backswing", "impact", "follow_through"]:
        user_frame = user_frames[user_phases[phase]]
        ref_frame = ref_frames[ref_phases[phase]]
        for name, label in readable.items():
            diff = user_frame.angles[name] - ref_frame.angles[name]
            if abs(diff) > 14:
                direction = "more open" if diff > 0 else "more closed"
                tips.append(f"During {phase.replace('_', '-')}: {label} is {abs(diff):.1f} degrees {direction} than {player}.")
                break

    user_temporal = build_temporal_shot_features(user_frames)
    ref_temporal = build_temporal_shot_features(ref_frames)
    rotation_gap = float(user_temporal.get("hip_rotation_range", 0.0)) - float(ref_temporal.get("hip_rotation_range", 0.0))
    speed_gap = float(user_temporal.get("wrist_speed", 0.0)) - float(ref_temporal.get("wrist_speed", 0.0))
    if abs(rotation_gap) > 18:
        direction = "more" if rotation_gap > 0 else "less"
        tips.append(f"Torso rotation is {abs(rotation_gap):.1f} degrees {direction} than {player}; this changes shot direction and power.")
    if abs(speed_gap) > 0.04:
        direction = "faster" if speed_gap > 0 else "slower"
        tips.append(f"Wrist path is moving {direction} than {player}; check swing tempo through impact.")
    if not tips:
        tips.append(f"Strong technical match with {player}; biggest gains may come from timing and bat/ball context.")
    return tips[:4]


def mean_angles(frames: List[PoseFrame]) -> Dict[str, float]:
    return {
        name: float(np.mean([frame.angles[name] for frame in frames]))
        for name in JOINTS
    }
