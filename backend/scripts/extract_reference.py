import argparse
import json
from pathlib import Path

from app.services.pose_service import PoseService


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract MediaPipe landmarks from a reference cricket video.")
    parser.add_argument("--video", required=True, help="Path to MP4/MOV cricket reference clip")
    parser.add_argument("--out", required=True, help="Output player folder, e.g. dataset/batting/virat_kohli")
    parser.add_argument("--player", required=True, help="Display player name")
    parser.add_argument("--category", choices=["batting", "bowling"], required=True)
    parser.add_argument("--shot-type", required=True, help="Action label, e.g. cover drive")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    service = PoseService()
    frames, _, fps, metadata = service.analyze_video(Path(args.video), session_id=f"reference_{out_dir.name}")
    if not frames:
        raise SystemExit("No pose detected in reference clip")

    payload = {
        "player": args.player,
        "category": args.category,
        "shot_type": args.shot_type,
        "fps_processed": round(fps, 2),
        "analysis_metadata": metadata,
        "frames": [
            {
                "landmarks": frame.landmarks,
                "normalized": frame.normalized,
                "angles": frame.angles,
                "torso": frame.torso,
                "bat": frame.bat,
                "embedding": frame.embedding,
                "confidence": frame.confidence,
            }
            for frame in frames
        ],
    }
    with (out_dir / "landmarks.json").open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    print(f"Wrote {len(frames)} pose frames to {out_dir / 'landmarks.json'}")


if __name__ == "__main__":
    main()
