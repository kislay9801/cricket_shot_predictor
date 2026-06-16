import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { mockInference, type InferenceResult } from "@/lib/inference";
import { shotByName } from "@/lib/shots-data";
import type { PredictResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface PredictBody {
  videoUrl?: string;
  sessionId?: string;
}

/**
 * POST /api/predict
 * Body: { videoUrl, sessionId }
 * Runs inference (real endpoint if ML_INFERENCE_URL is set, else the mock),
 * persists the result to Firestore `predictions`, and returns the analysis.
 */
export async function POST(req: Request) {
  let body: PredictBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { videoUrl, sessionId } = body;
  if (!videoUrl || !sessionId) {
    return NextResponse.json(
      { error: "videoUrl and sessionId are required" },
      { status: 400 },
    );
  }

  // ── Inference ────────────────────────────────────────────────────────────
  let inference: InferenceResult;
  const mlUrl = process.env.ML_INFERENCE_URL;
  if (mlUrl) {
    try {
      const res = await fetch(mlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
        // keep within the function budget
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) throw new Error(`ML endpoint ${res.status}`);
      inference = (await res.json()) as InferenceResult;
    } catch (err) {
      console.error("ML inference failed:", err);
      return NextResponse.json(
        {
          error:
            "Couldn't reach the analyzer — it may be waking up from sleep. Please try again in a moment.",
        },
        { status: 502 },
      );
    }
  } else {
    // TODO(real-model): wire ML_INFERENCE_URL to a Python frame-extraction +
    // pose/vision service. Until then we return a deterministic mock.
    inference = mockInference(videoUrl);
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

  // ── Persist ──────────────────────────────────────────────────────────────
  const adminDb = getAdminDb();
  if (adminDb) {
    try {
      const docRef = await adminDb.collection("predictions").add({
        sessionId,
        videoUrl,
        predictedShot: response.predictedShot,
        confidence: response.confidence,
        topPredictions: response.topPredictions,
        detectedIndicators: response.detectedIndicators,
        createdAt: FieldValue.serverTimestamp(),
      });
      response.predictionId = docRef.id;
    } catch (err) {
      // Don't fail the request if persistence fails — the user still gets a result.
      console.error("Failed to persist prediction:", err);
    }
  }

  return NextResponse.json(response);
}
