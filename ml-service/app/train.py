"""Train the cricket-shot classifier on dataset/batting and save artifacts.

Run from the repo root:
    .venv/Scripts/python -m ml-service.app.train
or from ml-service/:
    python -m app.train

Outputs to ml-service/artifacts/:
    model.joblib   — fitted sklearn pipeline (scaler + classifier)
    meta.json      — labels, feature names, CV accuracy, confusion matrix
"""
from __future__ import annotations

import glob
import json
import os
import sys

import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

from .pose import PoseExtractor
from .features import extract_features, features_to_vector, FEATURE_NAMES

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATASET = os.path.join(ROOT, "dataset", "batting")
ARTIFACTS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts")
CACHE = os.path.join(ARTIFACTS, "feature_cache.npz")

# dataset folder -> display name (matches the slugs in lib/shots-data.ts)
LABELS = {
    "cover_drive": "Cover Drive",
    "pull_shot": "Pull Shot",
    "straight_drive": "Straight Drive",
}
# Permissive thresholds so every clip in the dataset is used. Broadcast wide
# shots detect at a low rate; we keep them as long as a handful of frames have
# a pose. Raise these if you later want to drop the noisiest clips.
MIN_FRAMES = 5           # need at least this many detected poses
MIN_DETECTION = 0.10     # and at least this detection rate


def build_dataset(use_cache: bool = True):
    if use_cache and os.path.exists(CACHE):
        data = np.load(CACHE, allow_pickle=True)
        print(f"Loaded cached features for {len(data['y'])} clips.\n")
        return data["X"], data["y"], list(data["paths"])

    extractor = PoseExtractor()
    X, y, paths = [], [], []
    skipped = []
    for folder, label in LABELS.items():
        clips = sorted(glob.glob(os.path.join(DATASET, folder, "*.mp4")))
        print(f"[{label}] {len(clips)} clips")
        for clip in clips:
            name = os.path.basename(clip)
            try:
                seq = extractor.extract(clip)
            except Exception as e:  # noqa: BLE001
                print(f"   [ERR]  {name[:40]:42} extract error: {e}")
                skipped.append(name)
                continue
            if seq.n_frames < MIN_FRAMES or seq.detection_rate < MIN_DETECTION:
                print(
                    f"   [skip] {name[:40]:42} "
                    f"(frames={seq.n_frames}, det={seq.detection_rate:.2f})"
                )
                skipped.append(name)
                continue
            feats, _ = extract_features(seq)
            X.append(features_to_vector(feats))
            y.append(label)
            paths.append(os.path.join(folder, name))
            print(
                f"   [ok]   {name[:40]:42} frames={seq.n_frames:3d} det={seq.detection_rate:.2f}"
            )
    extractor.close()

    X = np.array(X, dtype=np.float32)
    y = np.array(y)
    print(f"\nUsable clips: {len(y)}  |  Skipped: {len(skipped)}")
    os.makedirs(ARTIFACTS, exist_ok=True)
    np.savez(CACHE, X=X, y=y, paths=np.array(paths))
    return X, y, paths


def evaluate(name, pipe, X, y):
    """Leave-one-out CV — the honest metric for a small dataset."""
    pred = cross_val_predict(pipe, X, y, cv=LeaveOneOut())
    acc = accuracy_score(y, pred)
    print(f"\n=== {name} — leave-one-out CV ===")
    print(f"Accuracy: {acc:.3f} ({int(acc*len(y))}/{len(y)})")
    labels_sorted = sorted(set(y))
    print("Confusion matrix (rows=true, cols=pred):")
    print("        " + "  ".join(f"{l[:8]:>8}" for l in labels_sorted))
    cm = confusion_matrix(y, pred, labels=labels_sorted)
    for i, l in enumerate(labels_sorted):
        print(f"{l[:8]:>8}  " + "  ".join(f"{v:>8d}" for v in cm[i]))
    print(classification_report(y, pred, zero_division=0))
    return acc, cm.tolist(), labels_sorted


def main():
    use_cache = "--no-cache" not in sys.argv
    X, y, paths = build_dataset(use_cache=use_cache)
    if len(y) < 6:
        print("Not enough usable clips to train. Aborting.")
        sys.exit(1)

    candidates = {
        "LogisticRegression": Pipeline([
            ("scale", StandardScaler()),
            ("clf", LogisticRegression(max_iter=2000, C=0.5, class_weight="balanced")),
        ]),
        "RandomForest": Pipeline([
            ("scale", StandardScaler()),
            ("clf", RandomForestClassifier(
                n_estimators=300, max_depth=6, min_samples_leaf=2,
                class_weight="balanced", random_state=42,
            )),
        ]),
    }

    results = {}
    for name, pipe in candidates.items():
        acc, cm, labels_sorted = evaluate(name, pipe, X, y)
        results[name] = (acc, cm, labels_sorted, pipe)

    best_name = max(results, key=lambda k: results[k][0])
    best_acc, best_cm, labels_sorted, best_pipe = results[best_name]
    print(f"\n>> Best model: {best_name} (LOO accuracy {best_acc:.3f})")

    # Fit the best pipeline on ALL data for the shipped artifact.
    best_pipe.fit(X, y)
    os.makedirs(ARTIFACTS, exist_ok=True)
    joblib.dump(best_pipe, os.path.join(ARTIFACTS, "model.joblib"))

    meta = {
        "model": best_name,
        "labels": sorted(set(y.tolist())),
        "feature_names": FEATURE_NAMES,
        "cv_accuracy": round(best_acc, 4),
        "confusion_matrix": best_cm,
        "confusion_labels": labels_sorted,
        "n_train": int(len(y)),
        "min_frames": MIN_FRAMES,
        "min_detection": MIN_DETECTION,
    }
    with open(os.path.join(ARTIFACTS, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\nSaved model.joblib + meta.json to {ARTIFACTS}")


if __name__ == "__main__":
    main()
