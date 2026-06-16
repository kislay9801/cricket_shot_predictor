# 🏏 ShotSense — AI-powered cricket shot recognition

Upload a batting clip (or try a sample) and ShotSense tells you **which cricket
shot was played**, with a confidence score, alternate possibilities, detected
technique indicators, a 16-shot reference library, side-by-side compare mode,
and a per-device history with CSV export.

- **Frontend & backend:** Next.js 14 (App Router) + Tailwind CSS — no separate server
- **Database:** Firebase Firestore
- **File storage:** Firebase Storage
- **Auth:** Anonymous Firebase sessions (no sign-up)
- **ML:** A **real pose-based recognizer** trained on all of `dataset/batting/`
  lives in [`ml-service/`](ml-service/) (MediaPipe Pose → biomechanical features
  → classifier; **~79% leave-one-out accuracy** over Cover Drive / Pull Shot /
  Straight Drive). The Next.js app calls it via `ML_INFERENCE_URL`, and falls
  back to a built-in mock when that's unset.
- **AI Coach:** Per-shot feedback (strengths, fixes, a drill) via Google Gemini
  when `GEMINI_API_KEY` is set, with a built-in rule-based coach as fallback.
- **Deploy:** Vercel (free) + Firebase (Spark free plan)

> **Demo mode:** the app runs without any Firebase config — the shot library
> falls back to a built-in catalog and **"Try a sample clip"** works offline.
> Uploads, history and prediction persistence require Firebase (steps below).

---

## 1. Quick start (local)

```bash
npm install
cp .env.example .env.local   # then fill in the values (see step 2)
npm run dev                  # http://localhost:3000
```

You can explore the UI immediately in demo mode. To enable uploads + history,
configure Firebase below.

### Enable real shot recognition (the main feature)

```bash
cd ml-service
python -m venv .venv && .venv/Scripts/activate   # Windows (use source on mac/linux)
pip install -r requirements.txt
python -m app.train                              # train on dataset/batting (model is also pre-committed)
python -m uvicorn app.server:app --port 8000     # start the inference API
```

Then add to the Next.js `.env.local` and restart `npm run dev`:

```env
ML_INFERENCE_URL=http://127.0.0.1:8000/predict
```

Now uploads are classified by the trained model. See [ml-service/README.md](ml-service/README.md).

---

## 2. Firebase project setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Enable Anonymous Auth:** Build → **Authentication** → Get started →
   **Sign-in method** → **Anonymous** → Enable.
3. **Create Firestore:** Build → **Firestore Database** → Create database
   (Production mode) → pick a region.
4. **Create Storage:** Build → **Storage** → Get started.
5. **Web app config (client keys):** Project settings ⚙ → **General** →
   *Your apps* → **Web app** (`</>`). Copy the config values into `.env.local`:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

6. **Service account (server keys, secret):** Project settings ⚙ →
   **Service accounts** → **Generate new private key**. From the downloaded JSON:

   ```env
   FIREBASE_PROJECT_ID=your-project
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   > Keep the `\n` escapes inside the double quotes — the app converts them back
   > to real newlines at runtime.

---

## 3. Security rules

### Firestore rules

Firestore → **Rules** → paste and Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Reference data — anyone can read, nobody writes from the client (seed via Admin SDK).
    match /shots/{id} {
      allow read: if true;
      allow write: if false;
    }
    match /shotClips/{id} {
      allow read: if true;
      allow write: if false;
    }

    // Predictions — readable/writable only by the signed-in (anonymous) owner.
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

> Predictions are created **server-side via the Admin SDK** (which bypasses
> rules), so creation always works; the rules above govern client reads/deletes
> on the History page.

### Storage rules

Storage → **Rules** → paste and Publish:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Public read for thumbnails and example clips.
    match /shot-thumbnails/{file=**} { allow read: if true; allow write: if false; }
    match /shot-clips/{file=**}      { allow read: if true; allow write: if false; }

    // Users can read/write only their own uploads (anonymous auth).
    match /user-uploads/{sessionId}/{file=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == sessionId
                   && request.resource.size < 50 * 1024 * 1024
                   && request.resource.contentType.matches('video/.*');
    }
  }
}
```

---

## 4. Seed the shot library

Populates the `shots` collection with all 16 shot types:

```bash
npm run seed
# or: npx ts-node scripts/seed-firebase.ts
```

Requires the **service account** vars (step 2.6) in `.env.local`.

**(Optional) example clips & thumbnails** — upload to Storage following this
structure, then add matching `shotClips` documents (or extend the seed script):

```
/shot-thumbnails/{shotId}.jpg          e.g. cover-drive.jpg
/shot-clips/{shotId}/{clipId}.mp4
/user-uploads/{sessionId}/{timestamp}.mp4   (created automatically on upload)
```

`shotId` matches the document id slug (e.g. `cover-drive`, `pull-shot`).

---

## 5. Deploy to Vercel

1. Push this repo to GitHub and **Import** it in [Vercel](https://vercel.com).
2. **Environment Variables** → add every key from `.env.example`
   (all six `NEXT_PUBLIC_FIREBASE_*` **and** the three server vars
   `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`).
   For the private key, paste the full value including the `\n` escapes.
3. Deploy. `vercel.json` gives the API routes a 30s max duration.
4. In Firebase **Authentication → Settings → Authorized domains**, add your
   Vercel domain (e.g. `your-app.vercel.app`).

### (Optional) Real ML model

Set `ML_INFERENCE_URL` to a service that accepts `POST { videoUrl }` and returns:

```json
{
  "predictedShot": "Cover Drive",
  "confidence": 87,
  "topPredictions": [{ "shot": "Cover Drive", "confidence": 87 }],
  "detectedIndicators": ["High elbow through impact"]
}
```

`/api/predict` calls it automatically and falls back to the mock on failure.
See the `TODO(real-model)` markers in `lib/inference.ts` and `app/api/predict/route.ts`.

---

## Project structure

```
app/
  page.tsx                 Home / Predict (upload → analyze → result)
  library/ compare/ history/ about/
  api/predict/             POST — inference + Firestore persistence
  api/shots/               GET  — shot catalog
  api/shots/[id]/clips/    GET  — example clips for a shot
components/                VideoUploader, VideoPlayer, ConfidenceRing,
                           PredictionResult, ShotCard, ClipCarousel,
                           ComparePlayer, FilterTabs, Modal, Skeletons, icons
lib/
  firebase.ts              client SDK (Firestore, Storage, anon Auth)
  firebase-admin.ts        server Admin SDK
  inference.ts             mock inference (swap for real model)
  queries.ts               React Query hooks
  storage.ts               resumable uploads + validation
  session.tsx              anonymous session context
  shots-data.ts            canonical 16-shot catalog (seed + fallback)
scripts/seed-firebase.ts   seeds the shots collection
```

---

## Pages

| Route       | What it does                                                            |
|-------------|-------------------------------------------------------------------------|
| `/`         | Drag-drop upload, progress, preview, **Analyze Shot**, animated result  |
| `/library`  | 16 shots in a filterable grid; modal with clips, technique & mistakes   |
| `/compare`  | Your clip vs. a reference clip with synchronized play/pause             |
| `/history`  | Your past analyses + stats, delete, **Export CSV**                      |
| `/about`    | How it works, accuracy stats, FAQ accordion                             |

Built with a strict **light theme**, fully **mobile-responsive**, Framer Motion
transitions, and TanStack Query caching.
