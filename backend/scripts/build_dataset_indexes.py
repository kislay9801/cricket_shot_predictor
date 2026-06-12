import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List
import shutil

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.services.feature_service import average_vectors, frame_to_dict, sequence_features
from app.services.pose_service import PoseService


VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def slug(value: str) -> str:
    return value.lower().strip().replace(" ", "_").replace("-", "_")


def discover_clips(dataset_dir: Path, strategy: str = "shot-only") -> List[Dict]:
    """Accepts shot-only and player-aware real clip layouts."""
    clips = []
    seen = set()
    shot_only_layouts = [
        # dataset/<shot>/*.mp4, e.g. dataset/pull_shot/rohit_pull_1.mp4
        ("shot_only", "shot_only"),
        # dataset/batting/<shot>/*.mp4 or dataset/bowling/<action>/*.mp4
        ("category_shot_only", "shot_only"),
    ]
    player_layouts = [
        # dataset/clips/<category>/<shot>/<player>/*.mp4
        ("clips", "category_shot_player"),
        ("raw", "category_shot_player"),
        # dataset/<category>/shots/<shot>/<player>/*.mp4
        ("category_shots", "category_shot_player"),
        # dataset/<category>/players/<player>/<shot>/*.mp4
        ("category_players", "category_player_shot"),
    ]
    if strategy == "shot-only":
        layouts = shot_only_layouts
    elif strategy == "player-aware":
        layouts = player_layouts
    else:
        layouts = shot_only_layouts + player_layouts
    for layout, kind in layouts:
        for item in iter_layout(dataset_dir, layout, kind):
            key = (item["category"], item["shot_slug"], item["player_slug"], item["path"].name.lower())
            if key in seen:
                continue
            seen.add(key)
            clips.append(item)
    return clips


def iter_layout(dataset_dir: Path, layout: str, kind: str):
    if layout == "shot_only":
        roots = [
            child
            for child in dataset_dir.iterdir()
            if child.is_dir()
            and child.name not in {"batting", "bowling", "clips", "raw", "shots", "players"}
            and not child.name.startswith(".")
        ]
    elif layout == "category_shot_only":
        roots = [
            child
            for category in (dataset_dir / "batting", dataset_dir / "bowling")
            if category.exists()
            for child in category.iterdir()
            if child.is_dir()
            and child.name not in {"shots", "players"}
            and not child.name.startswith(".")
        ]
    elif layout in {"clips", "raw"}:
        roots = [dataset_dir / layout]
    elif layout == "category_shots":
        roots = [category / "shots" for category in (dataset_dir / "batting", dataset_dir / "bowling")]
    else:
        roots = [category / "players" for category in (dataset_dir / "batting", dataset_dir / "bowling")]

    for root in roots:
        if not root.exists():
            continue
        if layout in {"shot_only", "category_shot_only"}:
            shot_slug = slug(root.name)
            category = root.parent.name if root.parent.name in {"batting", "bowling"} else "batting"
            for video in root.rglob("*"):
                if video.suffix.lower() in VIDEO_EXTENSIONS:
                    yield {
                        **clip_item(video, category, shot_slug, "shot_reference"),
                        "player": "Shot Reference",
                        "source_kind": "shot_only",
                    }
        elif layout in {"clips", "raw"}:
            for category_dir in root.iterdir():
                if not category_dir.is_dir():
                    continue
                yield from iter_category_tree(category_dir, kind)
        else:
            category = root.parent.name
            for first in root.iterdir():
                if not first.is_dir():
                    continue
                for second in first.iterdir():
                    if not second.is_dir():
                        continue
                    if kind == "category_shot_player":
                        shot_slug, player_slug = slug(first.name), slug(second.name)
                    else:
                        player_slug, shot_slug = slug(first.name), slug(second.name)
                    for video in second.rglob("*"):
                        if video.suffix.lower() in VIDEO_EXTENSIONS:
                            yield clip_item(video, category, shot_slug, player_slug)


def iter_category_tree(category_dir: Path, kind: str):
    category = category_dir.name
    for first in category_dir.iterdir():
        if not first.is_dir():
            continue
        for second in first.iterdir():
            if not second.is_dir():
                continue
            if kind == "category_shot_player":
                shot_slug, player_slug = slug(first.name), slug(second.name)
            else:
                player_slug, shot_slug = slug(first.name), slug(second.name)
            for video in second.rglob("*"):
                if video.suffix.lower() in VIDEO_EXTENSIONS:
                    yield clip_item(video, category, shot_slug, player_slug)


def clip_item(video: Path, category: str, shot_slug: str, player_slug: str) -> Dict:
    return {
        "path": video,
        "category": category,
        "shot_slug": shot_slug,
        "shot_type": shot_slug.replace("_", " "),
        "player_slug": player_slug,
        "player": player_slug.replace("_", " ").title(),
        "source_kind": "player_labeled",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build two-stage shot/player pose indexes from real cricket clips.")
    parser.add_argument("--dataset", default=str(ROOT / "dataset"), help="Dataset root")
    parser.add_argument("--min-frames", type=int, default=8, help="Minimum detected pose frames per clip")
    parser.add_argument("--strategy", choices=["shot-only", "player-aware", "all"], default="shot-only")
    parser.add_argument("--no-clean", action="store_true", help="Do not remove generated dataset/shots and dataset/players before building")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset)
    shots_dir = dataset_dir / "shots"
    players_dir = dataset_dir / "players"
    if not args.no_clean:
        for generated_dir in (shots_dir, players_dir):
            if generated_dir.exists():
                shutil.rmtree(generated_dir)
    shots_dir.mkdir(parents=True, exist_ok=True)
    players_dir.mkdir(parents=True, exist_ok=True)

    clips = discover_clips(dataset_dir, strategy=args.strategy)
    if not clips:
        raise SystemExit(
            "No clips found for this strategy. For shot-only mode, put videos under "
            "dataset/<shot_name>/*.mp4, for example dataset/pull_shot/rohit_pull_1.mp4"
        )
    assign_shot_only_reference_slugs(clips)

    pose = PoseService()
    grouped: Dict[tuple, List[Dict]] = defaultdict(list)
    for clip in clips:
        print(f"Processing {clip['path']}")
        frames, _, fps, metadata = pose.analyze_video(clip["path"], session_id=f"preprocess_{clip['player_slug']}_{clip['shot_slug']}")
        if len(frames) < args.min_frames:
            print(f"  skipped: only {len(frames)} pose frames detected")
            continue
        features = sequence_features(frames)
        grouped[(clip["category"], clip["shot_slug"], clip["player_slug"])].append(
            {
                "clip": str(clip["path"].relative_to(dataset_dir)),
                "player": clip["player"],
                "player_slug": clip["player_slug"],
                "source_kind": clip.get("source_kind", "player_labeled"),
                "shot_type": clip["shot_type"],
                "shot_slug": clip["shot_slug"],
                "category": clip["category"],
                "fps_processed": round(fps, 2),
                "analysis_metadata": metadata,
                "features": features,
                "frames": [frame_to_dict(frame) for frame in frames],
            }
        )

    shot_entries: Dict[str, List[Dict]] = defaultdict(list)
    player_entries: Dict[str, List[Dict]] = defaultdict(list)

    for (category, shot_slug, player_slug), clip_entries in grouped.items():
        representative = max(clip_entries, key=lambda item: item["features"]["avg_confidence"])
        features = merge_features([entry["features"] for entry in clip_entries])
        player_name = representative["player"]
        shot_type = representative["shot_type"]
        payload = {
            "player": player_name,
            "player_slug": player_slug,
            "source_kind": representative.get("source_kind", "player_labeled"),
            "shot_type": shot_type,
            "shot_slug": shot_slug,
            "category": category,
            "clip_count": len(clip_entries),
            "clips": [entry["clip"] for entry in clip_entries],
            "features": features,
            "frames": representative["frames"],
        }
        shot_dir = shots_dir / shot_slug
        shot_dir.mkdir(parents=True, exist_ok=True)
        write_json(shot_dir / f"{player_slug}.json", payload)
        shot_entries[shot_slug].append(payload)

        player_dir = players_dir / player_slug
        player_dir.mkdir(parents=True, exist_ok=True)
        write_json(player_dir / f"{shot_slug}.json", payload)
        player_entries[player_slug].append(payload)

    for shot_slug, entries in shot_entries.items():
        canonical = {
            "shot_type": shot_slug.replace("_", " "),
            "shot_slug": shot_slug,
            "kind": "canonical",
            "source_players": [entry["player"] for entry in entries],
            "source_kind": "shot_only" if all(entry.get("source_kind") == "shot_only" for entry in entries) else "player_labeled",
            "sample_count": sum(entry["clip_count"] for entry in entries),
            "features": merge_features([entry["features"] for entry in entries]),
        }
        write_json(shots_dir / shot_slug / "canonical.json", canonical)

    for player_slug, entries in player_entries.items():
        profile = {
            "player": entries[0]["player"],
            "player_slug": player_slug,
            "shots": [entry["shot_slug"] for entry in entries],
            "clip_count": sum(entry["clip_count"] for entry in entries),
            "features": merge_features([entry["features"] for entry in entries]),
        }
        write_json(players_dir / player_slug / "style_profile.json", profile)

    print(f"Built {len(shot_entries)} shot indexes and {len(player_entries)} player profiles.")


def assign_shot_only_reference_slugs(clips: List[Dict]) -> None:
    counts: Dict[str, int] = defaultdict(int)
    for clip in sorted(clips, key=lambda item: (item["shot_slug"], str(item["path"]).lower())):
        if clip.get("source_kind") != "shot_only":
            continue
        counts[clip["shot_slug"]] += 1
        clip["player_slug"] = f"shot_reference_{counts[clip['shot_slug']]:03d}"
        clip["player"] = f"Shot Reference {counts[clip['shot_slug']]:03d}"


def merge_features(features: List[Dict]) -> Dict:
    if not features:
        return {}
    return {
        "sequence_embedding": average_vectors([feature["sequence_embedding"] for feature in features]),
        "follow_through_embedding": average_vectors([feature["follow_through_embedding"] for feature in features]),
        "motion_embedding": average_vectors([feature["motion_embedding"] for feature in features]),
        "angle_change_embedding": average_vectors([feature["angle_change_embedding"] for feature in features]),
        "torso_embedding": average_vectors([feature["torso_embedding"] for feature in features]),
        "bat_embedding": average_vectors([feature["bat_embedding"] for feature in features]),
        "temporal_features": average_temporal([feature["temporal_features"] for feature in features]),
        "frame_count": int(round(sum(feature["frame_count"] for feature in features) / len(features))),
        "avg_confidence": round(sum(feature["avg_confidence"] for feature in features) / len(features), 6),
    }


def average_temporal(items: List[Dict]) -> Dict:
    keys = sorted({key for item in items for key in item})
    result = {}
    for key in keys:
        values = [item[key] for item in items if key in item]
        numeric = [value for value in values if isinstance(value, (int, float))]
        result[key] = round(sum(numeric) / len(numeric), 6) if numeric else values[0]
    return result


def write_json(path: Path, payload: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


if __name__ == "__main__":
    main()
