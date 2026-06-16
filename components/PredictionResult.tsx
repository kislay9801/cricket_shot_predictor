"use client";

import { motion } from "framer-motion";
import { ConfidenceRing } from "./ConfidenceRing";
import { CATEGORY_LABELS } from "@/lib/types";
import type { PredictResponse } from "@/lib/types";

interface PredictionResultProps {
  result: PredictResponse;
}

export function PredictionResult({ result }: PredictionResultProps) {
  const { predictedShot, confidence, topPredictions, detectedIndicators, shotDetails } =
    result;
  const alternates = topPredictions.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card relative grid grid-cols-1 gap-lg overflow-hidden p-lg md:grid-cols-2"
    >
      <span className="material-symbols-outlined pointer-events-none absolute right-sm top-sm text-[64px] text-outline-variant opacity-20">
        sports_cricket
      </span>

      {/* Left: score */}
      <div className="flex flex-col items-center justify-center border-b border-outline-variant pb-lg text-center md:border-b-0 md:border-r md:pb-0 md:pr-lg">
        <ConfidenceRing value={confidence} />
        <div className="mb-xs mt-md rounded bg-secondary-container px-sm py-xs font-label-caps text-[10px] uppercase text-on-secondary-container">
          Confidence Score
        </div>
        <h2 className="font-headline-lg text-headline-lg text-primary">{predictedShot}</h2>
        {shotDetails && (
          <span className="font-body-md font-bold text-secondary">
            {CATEGORY_LABELS[shotDetails.category]} Shot
          </span>
        )}
      </div>

      {/* Right: alternates + indicators */}
      <div className="flex flex-col justify-center">
        <h4 className="label-caps mb-md text-on-surface-variant">Other possibilities</h4>
        <div className="space-y-md">
          {alternates.map((alt, i) => (
            <div key={alt.shot}>
              <div className="mb-xs flex justify-between">
                <span className="font-body-md text-on-surface">{alt.shot}</span>
                <span className="font-data-mono text-data-mono text-on-surface-variant">
                  {alt.confidence}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-container">
                <motion.div
                  className="h-1.5 rounded-full bg-outline-variant"
                  initial={{ width: 0 }}
                  animate={{ width: `${alt.confidence}%` }}
                  transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>

        {detectedIndicators.length > 0 && (
          <div className="mt-xl flex flex-wrap gap-xs">
            {detectedIndicators.map((ind) => (
              <span
                key={ind}
                className="status-chip bg-secondary-container/60 text-on-secondary-container"
              >
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                {ind}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
