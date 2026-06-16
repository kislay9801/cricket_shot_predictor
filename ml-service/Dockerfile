FROM python:3.12-slim

# System libraries MediaPipe / OpenCV need at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App code + the committed trained model + pose model (no retraining on deploy).
COPY app ./app
COPY pose_model ./pose_model
COPY artifacts ./artifacts

ENV PYTHONUNBUFFERED=1

# Render provides $PORT; default to 8000 locally.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.server:app --host 0.0.0.0 --port ${PORT:-8000}"]
