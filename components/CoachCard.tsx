"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Skeleton } from "./SkeletonLoader";
import type { CoachFeedback } from "@/lib/coach";
import type { PredictResponse } from "@/lib/types";

interface CoachCardProps {
  result: PredictResponse;
  /** Unique per analysis so each upload gets fresh (uncached) AI feedback. */
  analysisId?: number;
}

export function CoachCard({ result, analysisId = 0 }: CoachCardProps) {
  const { data, isLoading, isError } = useQuery<CoachFeedback>({
    queryKey: ["coach", result.predictedShot, result.confidence, analysisId],
    queryFn: async () => {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictedShot: result.predictedShot,
          confidence: result.confidence,
          detectedIndicators: result.detectedIndicators,
          topPredictions: result.topPredictions,
          metrics: result.metrics ?? null,
        }),
      });
      if (!res.ok) throw new Error("coach failed");
      return res.json();
    },
    staleTime: Infinity,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-highest"
    >
      <div className="p-lg">
        <div className="mb-md flex items-center gap-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[18px]">psychology</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-primary">AI Coach Feedback</h3>
          {data?.source === "gemini" && (
            <span className="ml-auto font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
              Gemini
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-sm">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        ) : isError || !data ? (
          <p className="font-body-md text-on-surface-variant">
            Coach feedback is unavailable right now.
          </p>
        ) : (
          <>
            <p className="mb-lg font-body-md italic text-on-surface">
              &ldquo;{data.summary}&rdquo;
            </p>
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
              <FeedbackList
                title="What's working"
                items={data.strengths}
                icon="add_circle"
                tone="good"
              />
              <FeedbackList
                title="Work on this"
                items={data.improvements}
                icon="remove_circle"
                tone="warn"
              />
            </div>
          </>
        )}
      </div>

      {/* Drill */}
      {data?.drill && (
        <div className="border-t border-outline-variant bg-secondary-container/20 p-lg">
          <div className="mb-sm flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary">fitness_center</span>
            <span className="label-caps text-primary">Recommended drill</span>
          </div>
          <div className="rounded-lg border border-secondary/30 bg-surface-container-lowest p-md font-body-md text-on-surface-variant">
            {data.drill}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function FeedbackList({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: string;
  tone: "good" | "warn";
}) {
  if (!items || items.length === 0) return null;
  const color = tone === "good" ? "text-secondary" : "text-error";
  return (
    <div>
      <h4 className={`label-caps mb-sm ${color}`}>{title}</h4>
      <ul className="space-y-sm">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-sm font-body-md text-on-surface-variant"
          >
            <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
