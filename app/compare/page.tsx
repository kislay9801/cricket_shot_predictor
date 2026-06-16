"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { VideoUploader } from "@/components/VideoUploader";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { Skeleton } from "@/components/SkeletonLoader";
import { useLastAnalysis } from "@/lib/lastAnalysis";
import { useSession } from "@/lib/session";
import type { PredictResponse, ShotMetrics } from "@/lib/types";

interface Clip {
  file: File;
  previewUrl: string;
}

interface CompareResult {
  similarity: number;
  shotA: string;
  shotB: string;
  markers: { label: string; unit: string; valueA: number; valueB: number; matched: boolean }[];
}

const MARKER_DEFS: { label: string; key: keyof ShotMetrics; unit: string }[] = [
  { label: "Swing plane (vert/horiz)", key: "swing_plane_ratio", unit: "" },
  { label: "Front-knee bend", key: "front_knee_bend_deg", unit: "°" },
  { label: "Arm extension", key: "arm_extension_deg", unit: "°" },
];

async function predictClip(file: File, sessionId: string): Promise<PredictResponse> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sessionId", sessionId);
  const res = await fetch("/api/predict-upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Analysis failed");
  return res.json();
}

/** Cosine similarity of the two clips' per-shot probability vectors. */
function computeSimilarity(a: PredictResponse, b: PredictResponse): number {
  const shots = Array.from(
    new Set([...a.topPredictions, ...b.topPredictions].map((t) => t.shot)),
  );
  const vec = (r: PredictResponse) =>
    shots.map((s) => (r.topPredictions.find((t) => t.shot === s)?.confidence ?? 0) / 100);
  const va = vec(a);
  const vb = vec(b);
  const dot = va.reduce((s, x, i) => s + x * vb[i], 0);
  const na = Math.hypot(...va);
  const nb = Math.hypot(...vb);
  const cos = na && nb ? dot / (na * nb) : 0;
  return Math.round(Math.max(0, Math.min(1, cos)) * 100);
}

function buildMarkers(a: ShotMetrics | null | undefined, b: ShotMetrics | null | undefined) {
  if (!a || !b) return [];
  return MARKER_DEFS.map(({ label, key, unit }) => {
    const va = Number(a[key] ?? 0);
    const vb = Number(b[key] ?? 0);
    const matched = Math.abs(va - vb) <= 0.18 * Math.max(Math.abs(va), Math.abs(vb), 1);
    return { label, unit, valueA: Math.round(va * 10) / 10, valueB: Math.round(vb * 10) / 10, matched };
  });
}

export default function ComparePage() {
  const last = useLastAnalysis();
  const { sessionId } = useSession();
  const [clipA, setClipA] = useState<Clip | null>(
    last.file && last.previewUrl ? { file: last.file, previewUrl: last.previewUrl } : null,
  );
  const [clipB, setClipB] = useState<Clip | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const compare = useMutation({
    mutationFn: async () => {
      if (!clipA || !clipB) throw new Error("Two clips are required");
      const sid = sessionId ?? "demo";
      // Two separate single-clip analyses (each fits the ML service's memory),
      // then similarity is computed client-side from the probabilities/metrics.
      const a = await predictClip(clipA.file, sid);
      const b = await predictClip(clipB.file, sid);
      return {
        similarity: computeSimilarity(a, b),
        shotA: a.predictedShot,
        shotB: b.predictedShot,
        markers: buildMarkers(a.metrics, b.metrics),
      } as CompareResult;
    },
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl px-margin py-xl">
      <div className="mb-xl">
        <h1 className="mb-sm font-headline-lg text-headline-lg text-primary">
          Biomechanical Comparison
        </h1>
        <p className="max-w-2xl font-body-md text-on-surface-variant">
          Upload two clips — ShotSense runs MediaPipe pose on each and scores how
          closely their technique matches.
        </p>
      </div>

      <div className="grid gap-gutter md:grid-cols-2">
        <Slot index="01" title="Your clip" clip={clipA} onPick={(c) => { setClipA(c); setResult(null); }} />
        <Slot index="02" title="Comparison clip" clip={clipB} onPick={(c) => { setClipB(c); setResult(null); }} />
      </div>

      <div className="mt-lg flex flex-wrap items-center gap-md">
        <button
          onClick={() => compare.mutate()}
          disabled={!clipA || !clipB || compare.isPending}
          className="btn-success"
        >
          <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
          {compare.isPending ? "Analyzing both clips…" : "Run comparison"}
        </button>
        {!last.file && (
          <Link href="/" className="font-data-mono text-data-mono text-on-surface-variant hover:text-secondary">
            ← analyse a shot first to auto-fill clip 01
          </Link>
        )}
      </div>

      {compare.isPending ? (
        <div className="mt-lg"><Skeleton className="h-72 w-full rounded-xl" /></div>
      ) : result ? (
        <ResultPanel result={result} />
      ) : null}
    </div>
  );
}

function Slot({
  index,
  title,
  clip,
  onPick,
}: {
  index: string;
  title: string;
  clip: Clip | null;
  onPick: (c: Clip | null) => void;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-md flex items-center gap-sm">
        <span className="font-data-mono text-data-mono text-secondary">MODULE {index}</span>
        <span className="font-headline-md text-headline-md text-primary">· {title}</span>
      </div>
      {clip ? (
        <div>
          <VideoPlayer src={clip.previewUrl} lazy={false} />
          <button onClick={() => onPick(null)} className="btn-ghost mt-md py-sm" type="button">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Replace
          </button>
        </div>
      ) : (
        <VideoUploader
          sessionId={null}
          enableStorage={false}
          onUploadComplete={(r) => onPick({ file: r.file, previewUrl: r.previewUrl })}
        />
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: CompareResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mt-lg grid gap-lg lg:grid-cols-12"
    >
      <div className="card flex flex-col items-center justify-center gap-md p-lg text-center lg:col-span-4">
        <span className="label-caps text-on-surface-variant">Similarity Index</span>
        <ConfidenceRing value={result.similarity} />
        <p className="font-body-md text-on-surface-variant">
          {result.similarity >= 75
            ? "Very close technical match."
            : result.similarity >= 50
            ? "Broadly similar with some differences."
            : "Noticeably different techniques."}
        </p>
        <div className="font-data-mono text-data-mono text-outline">
          {result.shotA} vs {result.shotB}
        </div>
      </div>

      <div className="card p-lg lg:col-span-8">
        <h3 className="mb-md font-headline-md text-headline-md text-primary">
          Biomechanical Markers
        </h3>
        {result.markers.length === 0 ? (
          <p className="font-body-md text-on-surface-variant">Per-clip markers unavailable.</p>
        ) : (
          <div className="space-y-md">
            {result.markers.map((m) => (
              <div key={m.label} className="border-b border-outline-variant pb-md last:border-b-0">
                <div className="mb-xs flex items-center justify-between">
                  <span className="font-body-md text-on-surface">{m.label}</span>
                  <span
                    className={`status-chip ${
                      m.matched
                        ? "bg-secondary-container/60 text-on-secondary-container"
                        : "bg-error-container/60 text-on-error-container"
                    }`}
                  >
                    {m.matched ? "Matched" : "Differs"}
                  </span>
                </div>
                <div className="flex items-center gap-md font-data-mono text-data-mono text-on-surface-variant">
                  <span>YOURS: {m.valueA}{m.unit}</span>
                  <span className="text-outline-variant">|</span>
                  <span>OTHER: {m.valueB}{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
