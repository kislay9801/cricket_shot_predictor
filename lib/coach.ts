import { shotByName } from "./shots-data";
import type { TopPrediction, ShotMetrics } from "./types";

export interface CoachFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
  drill: string;
  source: "gemini" | "coach";
}

export interface CoachInput {
  predictedShot: string;
  confidence: number;
  detectedIndicators: string[];
  topPredictions: TopPrediction[];
  metrics?: ShotMetrics | null;
}

/** Turn raw pose metrics into plain-English observations for THIS clip. */
function describeMetrics(m?: ShotMetrics | null): string[] {
  if (!m) return [];
  const out: string[] = [];
  if (m.swing_plane_ratio >= 1.1) out.push("bat swing was fairly vertical (down the line)");
  else if (m.swing_plane_ratio <= 0.85) out.push("bat swing was cross-batted (horizontal)");
  if (m.front_knee_bend_deg <= 140) out.push(`front knee well bent (~${m.front_knee_bend_deg}°) — good weight transfer`);
  else if (m.front_knee_bend_deg >= 165) out.push(`front leg stayed fairly straight (~${m.front_knee_bend_deg}°)`);
  if (m.arm_extension_deg >= 160) out.push(`full arm extension at impact (~${m.arm_extension_deg}°)`);
  else if (m.arm_extension_deg <= 135) out.push(`arms stayed bent through impact (~${m.arm_extension_deg}°)`);
  if (m.hand_height >= 0.06) out.push("hands finished high (high follow-through)");
  else if (m.hand_height <= -0.06) out.push("hands stayed low");
  return out;
}

// Per-shot practice drills for the rule-based coach.
const DRILLS: Record<string, string> = {
  "Cover Drive":
    "Place a cone on a full length outside off and shadow-bat 20 reps focusing on a high front elbow and head leaning into the line; then hit 15 off a tee.",
  "Straight Drive":
    "Drop-feed straight half-volleys and drive them back past the feeder, checking your bat finishes pointing straight down the ground with the logo facing the bowler.",
  "Pull Shot":
    "Use a bouncer-feed or sidearm at chest height: rock back and across, get on top of the bounce and roll the wrists — 3 sets of 8, keeping the ball down.",
};

const GENERIC_DRILL =
  "Shadow-bat the movement slowly for 20 reps, then add a tee or drop-feed, filming side-on to check your shape at impact.";

function confidencePhrase(c: number): string {
  if (c >= 80) return "The model is confident the technique clearly matches this shot.";
  if (c >= 60) return "The model is fairly confident, though some elements overlap with other shots.";
  if (c >= 45) return "This is a tentative read — the motion shares traits with other shots.";
  return "Low confidence — the batter wasn't clearly visible, so treat this as a rough guess.";
}

/** Deterministic, data-driven coaching used when no Gemini key is configured. */
export function ruleBasedFeedback(input: CoachInput): CoachFeedback {
  const shot = shotByName(input.predictedShot);
  const { confidence, detectedIndicators, topPredictions } = input;

  const metricNotes = describeMetrics(input.metrics);
  const strengths = [
    ...metricNotes.slice(0, 2).map((n) => `This clip: ${n}.`),
    ...detectedIndicators.slice(0, 1).map((i) => `${i}.`),
  ].slice(0, 3);
  if (strengths.length === 0) strengths.push("Clear, repeatable swing shape detected.");

  const improvements: string[] = [];
  if (shot?.commonMistakes) {
    // Turn the catalog's "a, b, and c" mistakes into discrete watch-outs.
    shot.commonMistakes
      .replace(/\.$/, "")
      .split(/,| and /)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .forEach((m) => improvements.push(`Watch out for ${m.toLowerCase()}.`));
  }
  const alt = topPredictions[1];
  if (alt && alt.confidence >= 25) {
    improvements.push(
      `Your shape also resembled a ${alt.shot} (${alt.confidence}%) — exaggerate what makes the ${input.predictedShot} distinct.`,
    );
  }
  if (improvements.length === 0)
    improvements.push("Keep your head still and over the ball through impact.");

  const summary = shot
    ? `Recognised as a ${input.predictedShot} (${confidence}%). ${confidencePhrase(confidence)} ${shot.techniqueNotes}`
    : `Recognised as a ${input.predictedShot} (${confidence}%). ${confidencePhrase(confidence)}`;

  return {
    summary,
    strengths,
    improvements,
    drill: DRILLS[input.predictedShot] ?? GENERIC_DRILL,
    source: "coach",
  };
}

/** Calls Gemini for richer, personalised feedback. Throws on any failure so
 *  the route can fall back to the rule-based coach. */
export async function geminiFeedback(input: CoachInput): Promise<CoachFeedback> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("no key");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const shot = shotByName(input.predictedShot);

  const observed = describeMetrics(input.metrics);
  const m = input.metrics;
  const metricsBlock = m
    ? `Measured biomechanics FOR THIS SPECIFIC CLIP (reference these concretely):
- Swing plane ratio: ${m.swing_plane_ratio} (>1 = vertical/down-the-line bat, <1 = cross-bat)
- Front-knee bend: ${m.front_knee_bend_deg}° (lower = more bent / better weight transfer)
- Arm extension at impact: ${m.arm_extension_deg}° (higher = straighter)
- Hand height vs shoulders: ${m.hand_height} (+ = high finish)
Plain-English read: ${observed.join("; ") || "n/a"}`
    : "Per-clip biomechanics unavailable.";

  const prompt = `You are an expert cricket batting coach giving feedback on a single shot a player just played.
A pose model analysed their video and reported:
- Shot: ${input.predictedShot} (confidence ${input.confidence}%)
- Detected indicators: ${input.detectedIndicators.join("; ") || "none"}
- Alternate possibilities: ${input.topPredictions.slice(1).map((t) => `${t.shot} ${t.confidence}%`).join(", ") || "none"}
${shot ? `Reference technique: ${shot.techniqueNotes}\nCommon mistakes: ${shot.commonMistakes}` : ""}

${metricsBlock}

Base your feedback on THIS clip's measured numbers (cite specifics like the knee angle or swing plane where relevant) rather than generic advice. Be concise, encouraging and practical. Respond ONLY with JSON of this exact shape:
{"summary": string (2-3 sentences), "strengths": string[] (2-3 short points), "improvements": string[] (2-3 short actionable points), "drill": string (one specific practice drill)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
  });

  // Retry transient overload/rate-limit blips before giving up to the fallback.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) break;
    if (![429, 500, 503].includes(res.status)) break; // non-transient → stop
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  if (!res || !res.ok) throw new Error(`Gemini ${res?.status ?? "no response"}`);
  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty Gemini response");

  const parsed = JSON.parse(text);
  return {
    summary: String(parsed.summary ?? ""),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.map(String)
      : [],
    drill: String(parsed.drill ?? ""),
    source: "gemini",
  };
}
