# Cricket Pose Matcher

Cricket Pose Matcher is a full-stack MVP for comparing a user's batting or bowling movement against famous-player reference pose sequences.

## What It Does

- Webcam single-frame pose match
- Uploaded video pose match
- MediaPipe Pose landmark detection
- Torso-scale landmark normalization
- Joint-angle comparison for elbows, shoulders, hips, and knees
- Wrist trajectory scoring across videos
- Two-stage shot classification then player style matching
- DTW sequence alignment and phase-weighted matching
- Follow-through-heavy scoring
- Top-3 player ranking, match percentage, shot confidence, similarity breakdown, overlay frames, FPS, and coaching feedback

## Project Structure

```text
backend/
  main.py
  app/
    api/routes.py
    core/config.py
    models/schemas.py
    services/
      pose_service.py
      matching_service.py
      dataset_service.py
      session_service.py
  scripts/
    generate_starter_dataset.py
    extract_reference.py
frontend/
  src/
    components/
    pages/
    lib/api.js
dataset/
  clips/       # real MP4 input clips
  shots/       # generated shot-mechanics index
  players/     # generated player-style index
```

## Run Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open the API at `http://127.0.0.1:8000`. Do not open `http://0.0.0.0:8000` in the browser; `0.0.0.0` is only a server bind address.

Uploaded video analysis is optimized for cricket clips by processing only the middle action window by default:

```text
0%–25%   ignored: run-up, waiting, setup
25%–75%  analyzed: shot or bowling action
75%–100% ignored: ball follow, replay, dead time
```

Tune this in `backend/app/core/config.py` with `VIDEO_ANALYSIS_START_RATIO`, `VIDEO_ANALYSIS_END_RATIO`, and `MAX_ANALYSIS_FRAMES`.

API:

- `POST /upload-video` with multipart `file` and `mode=batting|bowling`
- `POST /webcam-frame` with JSON `{ "image_base64": "...", "mode": "batting" }`
- `GET /results`
- `GET /results?session_id=...`
- `GET /report/{session_id}`

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

If Vite says `Port 5173 is in use` and starts on `5174` or `5175`, open the URL Vite prints. The backend allows local Vite ports through CORS.

## Dataset Pipeline

For the current MVP, prefer shot-only classification. Put mixed-player clips directly under the shot name:

```text
dataset/
  cover_drive/
    rohit_cover_1.mp4
    kohli_cover_1.mp4
    sachin_cover_1.mp4
  pull_shot/
    rohit_pull_1.mp4
    warner_pull_1.mp4
    ponting_pull_1.mp4
```

Then build the two-stage indexes:

```bash
cd backend
python scripts/build_dataset_indexes.py --strategy shot-only
```

This writes:

```text
dataset/shots/<shot>/canonical.json
dataset/shots/<shot>/shot_reference.json
```

Shot-only mode predicts shot type and intentionally disables player style matching. The older synthetic generator is kept only for development fallback.

## How Pose Matching Works

MediaPipe Pose is used because it gives real-time 33-point body landmarks on normal webcams and sports clips without training a detector from scratch. Each frame is converted into landmarks `[x, y, z, visibility]`.

The matcher normalizes landmarks by translating the body to the hip center and dividing by torso length:

```text
normalized_point = (point - hip_center) / ||shoulder_center - hip_center||
```

This reduces camera-distance and player-height effects. For each frame, the backend builds an embedding from key body joints, joint angles, and visibility. It compares a user frame to a reference frame with:

```text
frame_score = 0.62 * cosine_similarity(embeddings) + 0.38 * angle_score
```

For video, sequences are aligned by resampling both actions to the same frame count. Final score blends aligned frame similarity with wrist trajectory similarity:

```text
sequence_score = 0.82 * mean(frame_scores) + 0.18 * wrist_trajectory_score
```

## Two-Stage Architecture

Stage 1 classifies the shot:

```text
user sequence -> canonical shot embeddings -> cover drive / pull shot / straight drive / defense
```

Stage 2 matches player style only inside that shot bucket:

```text
predicted pull shot -> compare only shots/pull_shot/*.json
```

This prevents a weak cover drive from being matched against a pull-shot reference.

## Cricket-Specific Matching Upgrades

The matcher is phase-aware. It detects phases using joint angle velocity and acceleration peaks, then compares matching phases only:

```text
stance -> backswing -> impact -> follow-through
```

Impact and follow-through are weighted higher than stance because many shots share a similar setup but diverge during swing release. The player matching formula is:

```text
final_score =
  0.35 * follow_through_similarity
  0.25 * sequence_similarity
  0.20 * phase_similarity
  0.20 * torso_and_motion_similarity
```

If the final score is below `0.65`, the API returns `No confident match`.

The final score now blends:

- Phase-aligned pose similarity
- Wrist, elbow, and shoulder velocity direction
- Joint angle change over time
- Torso rotation and hip-shoulder separation
- Bat trajectory when a bat-like line is detected near the wrists

The OpenCV bat cue uses Canny edges plus Hough line detection to find a long straight line near either wrist. It returns bat angle, normalized length, and confidence. For production, replace this lightweight detector with a YOLO cricket-bat model or manually annotated bat keypoints.

## Example Output

```json
{
  "best_match": { "player": "Virat Kohli", "score": 87.42, "shot_type": "cover drive" },
  "similarity_breakdown": {
    "elbow": 82.1,
    "shoulder": 90.4,
    "hip": 88.3,
    "knee": 79.7,
    "wrist_trajectory": 84.8
  },
  "coaching_feedback": [
    "Front Elbow is 14.2 degrees more closed compared to Virat Kohli."
  ]
}
```

## ML Improvement Section

The backend classifies shots from canonical shot indexes using temporal sequence features. It looks at motion, not just a static pose:

- wrist arc direction and speed
- elbow angle range and velocity
- hip/shoulder rotation range
- front/back foot transfer
- bat swing speed when a bat line is detected

To improve it further:

- Add more real clips per player and shot type.
- Store multiple `landmarks.json` files per class or merge many clips into one reference set.
- Train a temporal model such as TCN, LSTM, or Transformer over frame embeddings.
- Add bat/ball tracking for shot context.

## Production Improvements

- Move analysis jobs to a queue for long videos.
- Cache reference embeddings at startup.
- Add user accounts and cloud session storage.
- Use WebSocket streaming for continuous webcam scoring.
- Quantize or batch pose inference for better throughput.
- Add camera calibration and left/right handedness detection.
