# Backend image: FastAPI + MediaPipe + OpenCV.
# Build context must be the REPO ROOT (so the dataset/ folder is included):
#   docker build -f backend/Dockerfile -t cricket-backend .
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Native libraries required by MediaPipe and OpenCV at import time.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

# Copy the rest of the repo (.dockerignore strips venvs, node_modules, raw clips, etc.).
COPY . .

WORKDIR /app/backend

# Hosts inject the port via $PORT (Render, Cloud Run, Railway). Defaults to 8000 locally.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
