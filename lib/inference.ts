import { SHOTS } from "./shots-data";
import type { TopPrediction, ShotMetrics } from "./types";

/**
 * Indicators a real pose/vision model would surface. The mock samples from
 * these so result cards look meaningful; tagged loosely by shot category.
 */
const INDICATORS: Record<string, string[]> = {
  attacking: [
    "Front-foot stride detected",
    "High elbow through impact",
    "Full bat face presented",
    "Weight transfer forward",
    "Head over the ball",
    "Strong follow-through",
  ],
  defensive: [
    "Bat and pad close together",
    "Soft hands at contact",
    "Minimal backlift",
    "Balanced base",
    "Vertical bat angle",
  ],
  spin: [
    "Low front-knee position",
    "Horizontal bat swing",
    "Wrist rotation detected",
    "Sweeping arc across the line",
    "Head still and low",
  ],
  pace: [
    "Back-foot transfer detected",
    "Cross-bat swing plane",
    "Swivel on back foot",
    "Late contact point",
    "Arms freed from the body",
  ],
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tiny seeded PRNG (mulberry32) so a given clip yields a stable prediction. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface InferenceResult {
  predictedShot: string;
  confidence: number;
  topPredictions: TopPrediction[];
  detectedIndicators: string[];
  metrics?: ShotMetrics;
}

/**
 * Mock cricket-shot inference.
 *
 * TODO(real-model): Replace this with a call to a real frame-extraction +
 * pose/vision pipeline. Set `ML_INFERENCE_URL` and POST the extracted frames
 * (or the video URL) to a Python Cloud Function returning the same shape:
 *   { predictedShot, confidence, topPredictions[], detectedIndicators[] }.
 * The API route already prefers ML_INFERENCE_URL when present and only falls
 * back to this mock.
 */
// Only the shots the real model is actually trained on — the mock must never
// surface a shot (e.g. Reverse Sweep) the system can't truly predict.
const TRAINED_SHOTS = SHOTS.filter((s) =>
  ["cover-drive", "pull-shot", "straight-drive"].includes(s.id),
);

export function mockInference(seedKey: string): InferenceResult {
  const rand = mulberry32(hashString(seedKey || "shotsense"));

  // Weighted pick — give a gentle bias so confident-looking results emerge.
  const idx = Math.floor(rand() * TRAINED_SHOTS.length);
  const primary = TRAINED_SHOTS[idx];

  // Primary confidence between 62% and 96%.
  const confidence = Math.round((0.62 + rand() * 0.34) * 100);

  // Alternates are the other trained shots only.
  const others = TRAINED_SHOTS.filter((s) => s.id !== primary.id);
  const shuffled = [...others].sort(() => rand() - 0.5);
  const remaining = Math.max(2, 100 - confidence);
  const second = Math.round(remaining * (0.5 + rand() * 0.2));
  const third = Math.max(1, remaining - second);

  const topPredictions: TopPrediction[] = [
    { shot: primary.name, confidence },
    { shot: shuffled[0].name, confidence: second },
    { shot: shuffled[1].name, confidence: third },
  ];

  // 3 distinct indicators drawn from the primary shot's category bucket.
  const indicatorPool = [...INDICATORS[primary.category]].sort(() => rand() - 0.5);
  const detectedIndicators = indicatorPool.slice(0, 3);

  const metrics: ShotMetrics = {
    swing_plane_ratio: Number((0.6 + rand() * 1.0).toFixed(2)),
    shoulder_rotation_deg: Number((20 + rand() * 50).toFixed(1)),
    hip_rotation_deg: Number((10 + rand() * 40).toFixed(1)),
    front_knee_bend_deg: Number((120 + rand() * 50).toFixed(1)),
    arm_extension_deg: Number((130 + rand() * 45).toFixed(1)),
    hand_height: Number((-0.1 + rand() * 0.3).toFixed(2)),
  };

  return {
    predictedShot: primary.name,
    confidence,
    topPredictions,
    detectedIndicators,
    metrics,
  };
}
