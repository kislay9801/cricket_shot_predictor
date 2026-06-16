import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { mockInference, type InferenceResult } from "@/lib/inference";
import { shotByName } from "@/lib/shots-data";
import type { PredictResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/predict-upload  (multipart: file, sessionId)
 * The no-Storage path: the clip is uploaded directly here and forwarded to the
 * ML service's /predict-file endpoint. Used when Firebase Storage isn't enabled.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  const sessionId = (form.get("sessionId") as string) || "demo";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  let inference: InferenceResult;
  const mlUrl = process.env.ML_INFERENCE_URL;
  // Derive the file endpoint from ML_INFERENCE_URL (…/predict → …/predict-file).
  const fileUrl = mlUrl ? mlUrl.replace(/\/predict\/?$/, "/predict-file") : null;

  if (fileUrl) {
    try {
      const fd = new FormData();
      fd.append("file", file, file.name || "clip.mp4");
      const res = await fetch(fileUrl, {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) throw new Error(`ML endpoint ${res.status}`);
      inference = (await res.json()) as InferenceResult;
    } catch (err) {
      console.error("ML file inference failed, falling back to mock:", err);
      inference = mockInference(file.name);
    }
  } else {
    inference = mockInference(file.name);
  }

  const shotDetails = shotByName(inference.predictedShot) ?? null;
  const response: PredictResponse = {
    predictedShot: inference.predictedShot,
    confidence: inference.confidence,
    topPredictions: inference.topPredictions,
    detectedIndicators: inference.detectedIndicators,
    shotDetails,
    metrics: inference.metrics ?? null,
  };

  // Persist if the Admin SDK is configured (videoUrl empty — clip isn't stored).
  const adminDb = getAdminDb();
  if (adminDb) {
    try {
      const docRef = await adminDb.collection("predictions").add({
        sessionId,
        videoUrl: "",
        predictedShot: response.predictedShot,
        confidence: response.confidence,
        topPredictions: response.topPredictions,
        detectedIndicators: response.detectedIndicators,
        createdAt: FieldValue.serverTimestamp(),
      });
      response.predictionId = docRef.id;
    } catch (err) {
      console.error("Failed to persist prediction:", err);
    }
  }

  return NextResponse.json(response);
}
