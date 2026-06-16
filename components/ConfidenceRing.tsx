"use client";

import { useEffect, useState } from "react";

interface ConfidenceRingProps {
  /** 0–100 */
  value: number;
  size?: number;
}

/** Conic-gradient confidence ring with a counting-up mono readout. */
export function ConfidenceRing({ value, size = 128 }: ConfidenceRingProps) {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.round(target / 40));
    const id = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(id);
      }
      setPct(current);
    }, 12);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div
      className="circular-progress relative flex items-center justify-center rounded-full"
      style={{ width: size, height: size, ["--percent" as string]: pct }}
      role="img"
      aria-label={`${target}% confidence`}
    >
      <span className="font-data-mono text-headline-lg font-bold text-primary">
        {pct}%
      </span>
    </div>
  );
}
