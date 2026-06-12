// Normalize: trim whitespace and strip any trailing slash(es) so we never build
// a URL like "https://host//upload-video" (which the backend 404s on).
const RAW_API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export const API_BASE = RAW_API_BASE.trim().replace(/\/+$/, "");

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Request failed");
  }
  return payload;
}

const isLocal = /localhost|127\.0\.0\.1/.test(API_BASE);

// Free-tier hosts return brief 502/503/504s during cold-start and redeploys, and
// the first request after sleep can fail outright. Retry with backoff so a
// transient blip recovers silently instead of surfacing as "not reachable".
const RETRY_STATUSES = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [3000, 6000, 10000];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, options) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (RETRY_STATUSES.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return response;
    } catch (error) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const hint = isLocal
        ? "Start the FastAPI backend, then retry."
        : "The server may be waking up (free tier sleeps after inactivity) — wait ~30s and retry.";
      throw new Error(`Backend is not reachable at ${API_BASE}. ${hint}`);
    }
  }
}

export async function uploadVideo(file, mode) {
  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);
  return parseResponse(await request(`${API_BASE}/upload-video`, { method: "POST", body: form }));
}

export async function sendWebcamFrame(imageBase64, mode, sessionId) {
  return parseResponse(
    await request(`${API_BASE}/webcam-frame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64, mode, session_id: sessionId })
    })
  );
}

export async function fetchResults(sessionId) {
  const suffix = sessionId ? `?session_id=${sessionId}` : "";
  return parseResponse(await request(`${API_BASE}/results${suffix}`));
}
