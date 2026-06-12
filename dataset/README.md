# Dataset Strategy

Use a shot-only dataset for now. This is more reliable than trying to classify both shot type and player style from too few player-specific clips.

Recommended layout:

```text
dataset/
  batting/
    cover_drive/
      rohit_cover_1.mp4
      kohli_cover_1.mp4
      root_cover_1.mp4
      sachin_cover_1.mp4
    pull_shot/
      rohit_pull_1.mp4
      warner_pull_1.mp4
      ponting_pull_1.mp4
      kohli_pull_1.mp4
    straight_drive/
      kohli_straight_1.mp4
      sachin_straight_1.mp4
      williamson_straight_1.mp4
```

The clip filenames can contain player names for your own organization, but the model treats all clips inside a folder as examples of that shot type.

Build processed MediaPipe indexes:

```bash
cd backend
python scripts/build_dataset_indexes.py --strategy shot-only
```

Generated output:

```text
dataset/shots/<shot>/canonical.json
dataset/shots/<shot>/shot_reference.json
dataset/players/shot_reference/style_profile.json
```

In shot-only mode, the app predicts the shot type and intentionally disables player style matching.

If you intentionally want to include the older player-labeled folders, run:

```bash
python scripts/build_dataset_indexes.py --strategy player-aware
```

Add at least 10-20 clean HD clips per shot type for better accuracy. Trim clips so the batter is visible and the action is clear.
