# Deploying Cricket Pose Matcher (for free)

The app is two pieces:

- **Backend** — FastAPI + MediaPipe + OpenCV. Needs a container with ~512 MB–1 GB RAM
  (serverless platforms like Vercel/Netlify Functions and AWS Lambda can't host it — the
  ML deps exceed their size limits and need a long-lived process).
- **Frontend** — a static Vite/React build. Hosts anywhere for free.

Local development is unchanged — see the main `README.md`. The changes below only add
production config; nothing about running locally changed.

The frontend talks to the backend through one env var: **`VITE_API_BASE`**. Set it to your
deployed backend URL at build time. The backend allows the frontend's origin through CORS
via **`FRONTEND_ORIGINS`** (comma-separated).

---

## Option A — Render (simplest, one blueprint)

Render's free tier needs **no credit card**. This repo ships a `render.yaml` that deploys
both services at once.

1. Push this repo to GitHub.
2. In Render: **New + → Blueprint** → select the repo. It reads `render.yaml` and creates
   `cricket-backend` (Docker) and `cricket-frontend` (static).
3. First deploy finishes → copy the backend URL (e.g. `https://cricket-backend.onrender.com`).
4. Set env vars and redeploy:
   - On **cricket-frontend**: `VITE_API_BASE = https://cricket-backend.onrender.com`
   - On **cricket-backend**: `FRONTEND_ORIGINS = https://cricket-frontend.onrender.com`
5. Open the frontend URL. Done.

**Free-tier caveats (backend only):** 512 MB RAM and the service sleeps after 15 min idle
(first request after sleep cold-starts in ~30–60 s). Webcam single-frame matching is fine;
**large video uploads may hit the 512 MB memory limit.** If that happens, either upload
shorter clips or bump the backend to the ~$7/mo plan (or use Option C for more free RAM).
The static frontend has no such limits.

---

## Option B — Vercel (frontend) + Render (backend)

Vercel is the nicest free host for the static frontend (global CDN, no sleep). Pair it with
the Render backend from Option A.

1. Deploy the backend on Render as above (the `cricket-backend` service only).
2. On Vercel: **Add New → Project** → import the repo.
   - **Root Directory:** `frontend`
   - Framework preset: **Vite** (auto-detected; `frontend/vercel.json` is already set up)
   - **Environment Variable:** `VITE_API_BASE = https://cricket-backend.onrender.com`
3. After Vercel gives you a URL (e.g. `https://cricket-pose.vercel.app`), set it on the
   backend: `FRONTEND_ORIGINS = https://cricket-pose.vercel.app` and redeploy the backend.
   (The backend's CORS already allows any `*.vercel.app` origin by default, so preview
   deployments work too.)

---

## Option C — Hugging Face Spaces (backend, more free RAM)

If video uploads OOM on Render's 512 MB, **Hugging Face Spaces** gives a free CPU Space with
**2 vCPU + 16 GB RAM** and needs no credit card. Pair it with Vercel for the frontend.

1. Create a **Docker** Space (New Space → SDK: Docker).
2. The Space repo needs a `Dockerfile` **at its root**. The simplest approach: push this
   repo's contents to the Space and add a root `Dockerfile` that reuses ours, e.g.:
   ```dockerfile
   # Dockerfile (at Space root)
   FROM python:3.11-slim
   ENV PYTHONUNBUFFERED=1 STORAGE_DIR=/tmp/storage
   RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
       && rm -rf /var/lib/apt/lists/*
   WORKDIR /app
   COPY backend/requirements.txt backend/requirements.txt
   RUN pip install --no-cache-dir -r backend/requirements.txt
   COPY . .
   WORKDIR /app/backend
   EXPOSE 7860
   CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 7860"]
   ```
   and a README header declaring the port:
   ```yaml
   ---
   title: Cricket Pose Matcher API
   sdk: docker
   app_port: 7860
   ---
   ```
3. The Space URL looks like `https://<user>-<space>.hf.space`. Set the frontend's
   `VITE_API_BASE` to it on Vercel, and set `FRONTEND_ORIGINS` to your Vercel URL on the Space.

Spaces sleep after ~48 h of inactivity and wake on the next request.

---

## Test the production image locally (optional)

```bash
# from the repo root
docker build -f backend/Dockerfile -t cricket-backend .
docker run --rm -p 8000:8000 -e FRONTEND_ORIGINS=http://localhost:5173 cricket-backend
# backend now on http://localhost:8000  (health check: GET / -> {"status":"ok"})
```

Then run the frontend against it with `VITE_API_BASE=http://localhost:8000 npm run dev`.

## What changed in the code for deployment

- `backend/requirements.txt`: `opencv-python` → `opencv-python-headless` (the GUI build
  crashes on servers without `libGL`; this app never uses OpenCV windows).
- `backend/main.py`: CORS origins now read `FRONTEND_ORIGINS` (and allow `*.vercel.app`),
  in addition to the existing localhost dev origins.
- `backend/app/core/config.py`: storage dir is overridable via `STORAGE_DIR` for hosts with
  a read-only filesystem (e.g. Cloud Run → `STORAGE_DIR=/tmp/storage`).
- `backend/Dockerfile`, `.dockerignore`, `render.yaml`, `frontend/vercel.json`,
  `frontend/.env.example`: deploy config.
