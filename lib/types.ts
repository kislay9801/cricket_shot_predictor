export type ShotCategory = "attacking" | "defensive" | "spin" | "pace";

export interface Shot {
  id: string;
  name: string;
  category: ShotCategory;
  description: string;
  techniqueNotes: string;
  commonMistakes: string;
  thumbnailUrl: string;
  order: number;
}

export interface ShotClip {
  id: string;
  shotId: string;
  clipUrl: string;
  label: string;
  createdAt: number | null;
}

export interface TopPrediction {
  shot: string;
  confidence: number;
}

export interface Prediction {
  id: string;
  sessionId: string;
  videoUrl: string;
  predictedShot: string;
  confidence: number;
  topPredictions: TopPrediction[];
  detectedIndicators: string[];
  createdAt: number | null;
}

export interface ShotMetrics {
  swing_plane_ratio: number;
  shoulder_rotation_deg: number;
  hip_rotation_deg: number;
  front_knee_bend_deg: number;
  arm_extension_deg: number;
  hand_height: number;
}

export interface PredictResponse {
  predictedShot: string;
  confidence: number;
  topPredictions: TopPrediction[];
  detectedIndicators: string[];
  shotDetails: Shot | null;
  metrics?: ShotMetrics | null;
  predictionId?: string;
}

export interface CompareMarker {
  label: string;
  unit: string;
  valueA: number;
  valueB: number;
  matched: boolean;
}

export interface CompareResponse {
  similarity: number;
  shotA: string;
  shotB: string;
  markers: CompareMarker[];
  poseFramesA: number;
  poseFramesB: number;
  lowSignal: boolean;
}

export const CATEGORY_LABELS: Record<ShotCategory, string> = {
  attacking: "Attacking",
  defensive: "Defensive",
  spin: "Spin",
  pace: "Pace",
};
