import { Activity, Award, Gauge } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const end = Number(target) || 0;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(end * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function Pct({ value }) {
  const n = useCountUp(value);
  return <>{n.toFixed(1)}%</>;
}

export default function ScoreCard({ result }) {
  if (!result) return null;
  const best = result.best_match;
  return (
    <section className="stagger grid gap-4 md:grid-cols-4">
      <div className="metric">
        <div className="icon-chip bg-gold/12 text-gold"><Award className="h-5 w-5" /></div>
        <span>Closest match</span>
        <strong>{best.player}</strong>
      </div>
      <div className="metric">
        <div className="icon-chip bg-pitch/12 text-pitch"><Gauge className="h-5 w-5" /></div>
        <span>Match percentage</span>
        <strong><Pct value={best.score} /></strong>
      </div>
      <div className="metric">
        <div className="icon-chip bg-coral/12 text-coral"><Activity className="h-5 w-5" /></div>
        <span>Shot prediction</span>
        <strong>{result.shot_prediction}</strong>
      </div>
      <div className="metric">
        <div className="icon-chip bg-pitch/12 text-pitch"><Gauge className="h-5 w-5" /></div>
        <span>Shot confidence</span>
        <strong><Pct value={result.shot_confidence ?? 0} /></strong>
      </div>
    </section>
  );
}
