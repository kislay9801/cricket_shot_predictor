# 🏏 ShotSense — AI cricket shot recognition

Upload a batting clip and ShotSense tells you **which cricket shot was played**
— with a confidence score, alternate possibilities, detected technique
indicators, per-clip biomechanics, an **AI coach**, a **two-clip comparison**,
and a per-device **history**.

Live architecture: **Next.js (Vercel)** for the app + **Python/FastAPI (Render)**
for the pose ML + **Firebase** (Firestore + anonymous auth) + **Gemini** for
coaching.

> **Scope:** the model is trained on the clips in `dataset/batting/` and predicts
> **3 shots** — **Cover Drive, Pull Shot, Straight Drive**. Add more clips and
> retrain to improve it (see [Improving accuracy](#improving-accuracy)).

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend + API routes | Next.js 14 (App Router), Tailwind, Framer Motion, TanStack Query |
| Design | "Elite Cricket AI" — Hanken Grotesk + JetBrains Mono, navy/green, Material Symbols |
| ML service | FastAPI + MediaPipe Pose + scikit-learn (in [`ml-service/`](ml-service/)) |
| Database / auth | Firebase Firestore + anonymous Auth |
| AI coach | Google Gemini (`gemini-2.5-flash`), with a rule-based fallback |
| Hosting | Vercel (web) + Render (ML, Docker) |

## How it works

1. You upload a clip on the home page.
2. In the default **direct mode**, the clip is POSTed to the Next API route
   (`/api/predict-upload`), which forwards it to the ML service's `/predict-file`.
3. The ML service runs **MediaPipe Pose** over sampled frames → biomechanical
   features (joint angles, swing plane, rotation, etc.) → a trained classifier →
   predicted shot + confidence + per-clip metrics.
4. The result is shown, the **AI coach** (Gemini) turns the prediction + metrics
   into feedback, and the analysis is saved to your Firestore history.
5. **Compare** runs two single-clip analyses and computes a biomechanical
   similarity index client-side.

If `ML_INFERENCE_URL` is unset, `/api/predict` returns a built-in **mock**
(restricted to the 3 trained shots) so the UI is explorable without the ML service.

## The model

- **MediaPipe Pose (full model)**, CPU delegate forced so landmarks are
  identical across machines (train on Windows, serve on Linux).
- **96 frames** sampled per clip (balances accuracy vs. free-tier speed).
- **~70% leave-one-out accuracy** over the 3 shots on the current ~42-clip
  dataset. The model + pose model are committed under `ml-service/`.

---

## Local development

You need **two terminals**: the web app and the ML service.

```bash
# 1. Install + configure
npm install
cp .env.example .env.local      # fill in values (see Environment variables)

# 2. ML service (terminal A)
cd ml-service
python -m venv .venv && .venv/Scripts/activate      # Windows (source on mac/linux)
pip install -r requirements.txt
python -m uvicorn app.server:app --port 8000        # model is pre-trained & committed

# 3. Web app (terminal B)
npm run dev                                          # http://localhost:3000
```

Set `ML_INFERENCE_URL=http://127.0.0.1:8000/predict` in `.env.local` to use your
local ML server, **or** point it at your deployed Render URL to skip running it
locally.

> ⚠️ Don't run `cp .env.example .env.local` again after filling it in — it
> overwrites your keys.

---

## Environment variables

`.env.local` (web app) — see `.env.example`:

```env
# ML service (the Python pose recognizer)
ML_INFERENCE_URL=https://<your-render-service>.onrender.com/predict

# Upload mode: false = analyse via the ML service (no Firebase Storage / no Blaze)
NEXT_PUBLIC_ENABLE_STORAGE=false

# Firebase CLIENT (public web keys)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase ADMIN (server-only, secret) — enables saving predictions to History
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI coach (optional — falls back to rule-based feedback if unset)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

The app degrades gracefully: no Firebase → demo mode; no Gemini → rule-based
coach; no `ML_INFERENCE_URL` → mock predictions.

---

## Firebase setup

1. [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Authentication → Sign-in method → Anonymous → Enable.** (Powers per-device sessions/history.)
3. **Firestore Database → Create database** (Production mode).
4. **Firestore → Rules** → paste and Publish:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /predictions/{id} {
         allow read, delete: if request.auth != null
                             && resource.data.sessionId == request.auth.uid;
         allow create: if request.auth != null
                       && request.resource.data.sessionId == request.auth.uid;
         allow update: if false;
       }
     }
   }
   ```

5. **Service account (for History):** Project settings → **Service accounts** →
   **Generate new private key** → copy `project_id` / `client_email` /
   `private_key` into the `FIREBASE_*` admin vars (keep the `\n` escapes).
6. **Web config:** Project settings → **Your apps → Web app** → copy into the
   `NEXT_PUBLIC_FIREBASE_*` vars.

> **Firebase Storage is optional.** With `NEXT_PUBLIC_ENABLE_STORAGE=false`
> (default) clips go straight to the ML service and nothing is stored — no Blaze
> plan needed. To store clips in the cloud, enable Storage (requires the Blaze
> plan), set the flag to `true`, and add Storage rules allowing anon writes to
> `user-uploads/{uid}/`.

---

## ML service

See [`ml-service/README.md`](ml-service/README.md) for details. Key commands:

```bash
cd ml-service
python -m uvicorn app.server:app --port 8000   # serve (model is committed)
python -m app.train --no-cache                 # retrain on dataset/batting
```

Endpoints: `GET /health`, `GET /info`, `POST /predict` `{videoUrl}`,
`POST /predict-file` (multipart). Returns predicted shot, confidence,
`topPredictions`, `detectedIndicators`, and per-clip `metrics`.

---

## Deployment

**ML service → Render** (Docker):
1. render.com → **New → Blueprint** → pick this repo. It reads `render.yaml`
   and builds `ml-service/` (model + pose model are committed, so no training on
   deploy).
2. Note the URL, e.g. `https://shotsense-ml.onrender.com`. Check `…/health`.

**Web app → Vercel:**
1. vercel.com → **Add New → Project** → import this repo.
2. Add all the env vars above. Set **`ML_INFERENCE_URL`** to your Render URL **+
   `/predict`**. (`FIREBASE_PRIVATE_KEY`: paste with literal `\n`, no quotes.)
3. Deploy. After changing env vars, **redeploy** so they take effect.
4. Firebase → Authentication → **Authorized domains** → add your `*.vercel.app` domain.

**Free-tier notes:**
- Render free dynos sleep after ~15 min idle → first request cold-starts
  (~30–60 s); the app shows "analyzer waking up — retry".
- Vercel serverless caps request bodies at **4.5 MB**, so in direct mode keep
  clips short. (Enable Firebase Storage to bypass this.)
- `vercel.json` sets the API routes to a 60 s max duration.

---

## Improving accuracy

The model's ceiling is the dataset (~14 clips/shot). To improve:

1. **Add more clips** to `dataset/batting/{cover_drive,pull_shot,straight_drive}/`
   — aim for 30–50+ per shot, varied players/angles/zoom, single shot per clip,
   batter clearly visible.
2. **Retrain + redeploy:**
   ```bash
   cd ml-service && python -m app.train --no-cache
   git add ml-service/artifacts && git commit -m "Retrain" && git push   # Render auto-redeploys
   ```
   The training output prints leave-one-out accuracy + a confusion matrix.

---

## Project structure

```
app/
  page.tsx                   Home / Predict (upload → analyze → result + coach)
  compare/ history/ about/   pages
  not-found.tsx              custom 404
  api/predict/               POST {videoUrl}  → ML or mock + Firestore save
  api/predict-upload/        POST multipart   → ML /predict-file (direct mode)
  api/coach/                 POST → Gemini (or rule-based) coaching
  api/compare/               POST → ML /compare-files (legacy; UI now compares client-side)
  api/shots/ , api/shots/[id]/clips/
components/                  VideoUploader, VideoPlayer, ConfidenceRing,
                            PredictionResult, CoachCard, Navbar, Modal, …
lib/
  firebase.ts / firebase-admin.ts   Firebase client + admin
  inference.ts               mock inference (3 trained shots)
  coach.ts                   Gemini + rule-based coaching
  queries.ts / session.tsx / lastAnalysis.tsx / storage.ts / shots-data.ts / types.ts
ml-service/                  FastAPI + MediaPipe pose recognizer (see its README)
dataset/batting/             training clips (local; gitignored)
```

## Pages

| Route | What it does |
|-------|--------------|
| `/` | Upload a clip → predicted shot, confidence, indicators, AI coach |
| `/compare` | Compare two clips → biomechanical similarity + markers |
| `/history` | Past analyses, stats, delete, CSV export |
| `/about` | How it works, stats, FAQ |
