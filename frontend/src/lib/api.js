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

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    const hint = isLocal
      ? "Start the FastAPI backend, then retry."
      : "The server may be waking up (free tier sleeps after inactivity) — wait ~30s and retry.";
    throw new Error(`Backend is not reachable at ${API_BASE}. ${hint}`);
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
