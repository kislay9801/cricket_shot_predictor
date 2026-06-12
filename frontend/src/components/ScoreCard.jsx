import { Activity, Award, Gauge } from "lucide-react";
import React from "react";

export default function ScoreCard({ result }) {
  if (!result) return null;
  const best = result.best_match;
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <div className="metric">
        <Award className="h-5 w-5 text-gold" />
        <span>Closest match</span>
        <strong>{best.player}</strong>
      </div>
      <div className="metric">
        <Gauge className="h-5 w-5 text-pitch" />
        <span>Match percentage</span>
        <strong>{best.score}%</strong>
      </div>
      <div className="metric">
        <Activity className="h-5 w-5 text-coral" />
        <span>Shot prediction</span>
        <strong>{result.shot_prediction}</strong>
      </div>
      <div className="metric">
        <Gauge className="h-5 w-5 text-pitch" />
        <span>Shot confidence</span>
        <strong>{result.shot_confidence ?? 0}%</strong>
      </div>
    </section>
  );
}
