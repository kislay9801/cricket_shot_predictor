import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/compare  (multipart: fileA, fileB)
 * Forwards both clips to the ML service's /compare-files endpoint, which runs
 * MediaPipe pose on each and returns a biomechanical similarity + markers.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const fileA = form.get("fileA");
  const fileB = form.get("fileB");
  if (!(fileA instanceof File) || !(fileB instanceof File)) {
    return NextResponse.json({ error: "Two clips (fileA, fileB) are required" }, { status: 400 });
  }

  const mlUrl = process.env.ML_INFERENCE_URL;
  const compareUrl = mlUrl ? mlUrl.replace(/\/predict\/?$/, "/compare-files") : null;
  if (!compareUrl) {
    return NextResponse.json(
      { error: "Comparison needs the ML service (ML_INFERENCE_URL) running." },
      { status: 503 },
    );
  }

  try {
    const fd = new FormData();
    fd.append("fileA", fileA, fileA.name || "a.mp4");
    fd.append("fileB", fileB, fileB.name || "b.mp4");
    const res = await fetch(compareUrl, {
      method: "POST",
      body: fd,
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) throw new Error(`ML endpoint ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("Compare failed:", err);
    return NextResponse.json(
      { error: "Comparison failed. Is the ML service running?" },
      { status: 502 },
    );
  }
}
