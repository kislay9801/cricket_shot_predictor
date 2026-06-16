import { NextResponse } from "next/server";
import {
  geminiFeedback,
  ruleBasedFeedback,
  type CoachInput,
} from "@/lib/coach";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/coach
 * Body: { predictedShot, confidence, detectedIndicators[], topPredictions[] }
 * Returns AI-coach feedback. Uses Gemini when GEMINI_API_KEY is set, otherwise
 * a data-driven rule-based coach so the feature works out of the box.
 */
export async function POST(req: Request) {
  let body: CoachInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.predictedShot) {
    return NextResponse.json(
      { error: "predictedShot is required" },
      { status: 400 },
    );
  }

  const input: CoachInput = {
    predictedShot: body.predictedShot,
    confidence: body.confidence ?? 0,
    detectedIndicators: body.detectedIndicators ?? [],
    topPredictions: body.topPredictions ?? [],
    metrics: body.metrics ?? null,
  };

  try {
    return NextResponse.json(await geminiFeedback(input));
  } catch {
    // No key / quota / parse failure → graceful fallback.
    return NextResponse.json(ruleBasedFeedback(input));
  }
}
