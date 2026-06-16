"""Turn a pose sequence into a fixed-length biomechanical feature vector.

The features are designed to separate the three shots in the dataset:
  - front-foot drives (cover / straight) — more vertical bat path, upright torso
  - pull shot — cross-bat (horizontal) swing, strong shoulder/hip rotation
All geometry uses hip-centred world landmarks, so it's invariant to where the
batter is in the frame and to camera distance.
"""
from __future__ import annotations

import numpy as np

from .pose import (
    PoseSequence,
    L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST,
    L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE,
)

EPS = 1e-6


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle (degrees) at vertex b formed by a-b-c."""
    ba, bc = a - b, c - b
    nba, nbc = np.linalg.norm(ba), np.linalg.norm(bc)
    if nba < EPS or nbc < EPS:
        return 0.0
    cos = np.clip(np.dot(ba, bc) / (nba * nbc), -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


def _agg(name: str, values: np.ndarray) -> dict[str, float]:
    if values.size == 0:
        return {f"{name}_{s}": 0.0 for s in ("mean", "std", "min", "max", "rng")}
    return {
        f"{name}_mean": float(np.mean(values)),
        f"{name}_std": float(np.std(values)),
        f"{name}_min": float(np.min(values)),
        f"{name}_max": float(np.max(values)),
        f"{name}_rng": float(np.max(values) - np.min(values)),
    }


def extract_features(seq: PoseSequence) -> tuple[dict[str, float], dict[str, float]]:
    """Return (feature_dict, interpretable_metrics)."""
    W = seq.world  # (T, 33, 3)
    T = W.shape[0]
    if T < 3:
        # Not enough pose — return zeros (caller decides what to do).
        feats = _flat_zero_features()
        return feats, {"valid": 0.0}

    # Per-frame scalar series ------------------------------------------------
    elbow_l, elbow_r = [], []
    knee_l, knee_r = [], []
    shoulder_abd_l, shoulder_abd_r = [], []
    spine_lean = []
    shoulder_yaw, hip_yaw = [], []
    wrist_height = []      # how high hands are vs shoulders (+ = above)
    hands_sep = []         # distance between wrists (grip together?)
    hands_mid = []         # (x,y,z) midpoint of wrists, hip-centred

    for t in range(T):
        f = W[t]
        mid_sh = (f[L_SHOULDER] + f[R_SHOULDER]) / 2
        mid_hip = (f[L_HIP] + f[R_HIP]) / 2

        elbow_l.append(_angle(f[L_SHOULDER], f[L_ELBOW], f[L_WRIST]))
        elbow_r.append(_angle(f[R_SHOULDER], f[R_ELBOW], f[R_WRIST]))
        knee_l.append(_angle(f[L_HIP], f[L_KNEE], f[L_ANKLE]))
        knee_r.append(_angle(f[R_HIP], f[R_KNEE], f[R_ANKLE]))
        shoulder_abd_l.append(_angle(f[L_HIP], f[L_SHOULDER], f[L_ELBOW]))
        shoulder_abd_r.append(_angle(f[R_HIP], f[R_SHOULDER], f[R_ELBOW]))

        # Spine lean vs vertical (y axis). Smaller = more upright.
        spine = mid_sh - mid_hip
        spine_lean.append(_angle(mid_hip + np.array([0, -1.0, 0]), mid_hip, mid_sh))

        # Rotation: yaw of shoulder/hip line in the horizontal (x,z) plane.
        sh_vec = f[R_SHOULDER] - f[L_SHOULDER]
        hip_vec = f[R_HIP] - f[L_HIP]
        shoulder_yaw.append(np.degrees(np.arctan2(sh_vec[2], sh_vec[0] + EPS)))
        hip_yaw.append(np.degrees(np.arctan2(hip_vec[2], hip_vec[0] + EPS)))

        mid_wrist = (f[L_WRIST] + f[R_WRIST]) / 2
        # world y is downward → above-shoulder means smaller y; flip sign for intuition.
        wrist_height.append(float(mid_sh[1] - mid_wrist[1]))
        hands_sep.append(float(np.linalg.norm(f[L_WRIST] - f[R_WRIST])))
        hands_mid.append(mid_wrist - mid_hip)

    hands_mid = np.array(hands_mid)  # (T,3)

    # Motion / swing-plane features -----------------------------------------
    rng_xyz = hands_mid.max(axis=0) - hands_mid.min(axis=0)
    horiz_range = float(np.hypot(rng_xyz[0], rng_xyz[2]))
    vert_range = float(abs(rng_xyz[1]))
    swing_ratio = vert_range / (horiz_range + EPS)  # >1 vertical, <1 cross-bat

    deltas = np.linalg.norm(np.diff(hands_mid, axis=0), axis=1)
    path_len = float(deltas.sum())
    peak_speed = float(deltas.max()) if deltas.size else 0.0

    def yaw_range(arr):
        # Unwrapped angular travel of the shoulder/hip line — a strong shot
        # discriminator (kept as a model feature). It can exceed 360° on noisy
        # broadcast footage, so the *displayed* metric below is clamped to 0–180.
        a = np.unwrap(np.radians(np.array(arr)))
        return float(np.degrees(a.max() - a.min())) if a.size else 0.0

    shoulder_rot = yaw_range(shoulder_yaw)
    hip_rot = yaw_range(hip_yaw)

    # Assemble feature dict --------------------------------------------------
    feats: dict[str, float] = {}
    feats.update(_agg("elbow_l", np.array(elbow_l)))
    feats.update(_agg("elbow_r", np.array(elbow_r)))
    feats.update(_agg("knee_l", np.array(knee_l)))
    feats.update(_agg("knee_r", np.array(knee_r)))
    feats.update(_agg("sh_abd_l", np.array(shoulder_abd_l)))
    feats.update(_agg("sh_abd_r", np.array(shoulder_abd_r)))
    feats.update(_agg("spine_lean", np.array(spine_lean)))
    feats.update(_agg("wrist_height", np.array(wrist_height)))
    feats.update(_agg("hands_sep", np.array(hands_sep)))
    feats.update(
        {
            "horiz_range": horiz_range,
            "vert_range": vert_range,
            "swing_ratio": swing_ratio,
            "path_len": path_len,
            "peak_speed": peak_speed,
            "shoulder_rot": shoulder_rot,
            "hip_rot": hip_rot,
        }
    )

    # Interpretable metrics for the coach / compare UI. Rotation is clamped to a
    # physically sane 0–180° (the raw unwrapped value stays in `feats` for the model).
    metrics = {
        "valid": 1.0,
        "swing_ratio": swing_ratio,
        "horiz_range": horiz_range,
        "vert_range": vert_range,
        "shoulder_rot": min(shoulder_rot, 180.0),
        "hip_rot": min(hip_rot, 180.0),
        "wrist_height_mean": float(np.mean(wrist_height)),
        "knee_bend_min": float(min(np.min(knee_l), np.min(knee_r))),
        "elbow_max": float(max(np.max(elbow_l), np.max(elbow_r))),
    }
    return feats, metrics


def _reference_feature_names() -> list[str]:
    """Stable, ordered feature names (must match extract_features output)."""
    names: list[str] = []
    for base in ("elbow_l", "elbow_r", "knee_l", "knee_r", "sh_abd_l",
                 "sh_abd_r", "spine_lean", "wrist_height", "hands_sep"):
        names += [f"{base}_{s}" for s in ("mean", "std", "min", "max", "rng")]
    names += ["horiz_range", "vert_range", "swing_ratio", "path_len",
              "peak_speed", "shoulder_rot", "hip_rot"]
    return names


FEATURE_NAMES = _reference_feature_names()


def _flat_zero_features() -> dict[str, float]:
    return {name: 0.0 for name in FEATURE_NAMES}


def features_to_vector(feats: dict[str, float]) -> np.ndarray:
    return np.array([feats.get(n, 0.0) for n in FEATURE_NAMES], dtype=np.float32)


# Characteristic mechanics of each shot — used as the base for indicators so
# they accurately describe the *recognised* shot rather than relying on noisy
# absolute thresholds (world-coordinate signs vary too much for that).
_SHOT_INDICATORS: dict[str, list[str]] = {
    "Pull Shot": [
        "Cross-bat (horizontal) swing plane",
        "Back-foot weight transfer",
        "Strong shoulder & hip rotation",
    ],
    "Cover Drive": [
        "Front-foot stride to the pitch",
        "High elbow through the line",
        "Bat path angled towards cover",
    ],
    "Straight Drive": [
        "Vertical bat swing down the ground",
        "Head over the ball",
        "Balanced front-foot drive",
    ],
}


def derive_indicators(metrics: dict[str, float], predicted: str) -> list[str]:
    """Technique indicators for the recognised shot, augmented by a measured
    signal when one is clearly present."""
    out = list(_SHOT_INDICATORS.get(predicted, ["Pose-based motion analysed"]))
    if metrics.get("elbow_max", 0.0) > 155:
        out.append("Full arm extension at impact")
    elif metrics.get("knee_bend_min", 180.0) < 145:
        out.append("Bent front knee (clear weight transfer)")
    return out[:4]
