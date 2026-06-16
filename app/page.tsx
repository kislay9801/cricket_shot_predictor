"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { VideoUploader, type UploadResult } from "@/components/VideoUploader";
import { VideoPlayer } from "@/components/VideoPlayer";
import { PredictionResult } from "@/components/PredictionResult";
import { CoachCard } from "@/components/CoachCard";
import { ResultSkeleton } from "@/components/SkeletonLoader";
import { useSession } from "@/lib/session";
import { useLastAnalysis } from "@/lib/lastAnalysis";
import type { PredictResponse } from "@/lib/types";

const ENABLE_STORAGE = process.env.NEXT_PUBLIC_ENABLE_STORAGE === "true";

export default function PredictPage() {
  const { sessionId } = useSession();
  const { setLast } = useLastAnalysis();
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  // Bumped each analysis so the AI coach makes a fresh (non-cached) call.
  const [analysisId, setAnalysisId] = useState(0);

  const predict = useMutation({
    mutationFn: async (videoUrl: string) => {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, sessionId: sessionId ?? "demo" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Analysis failed");
      return (await res.json()) as PredictResponse;
    },
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message || "Analysis failed."),
  });

  const predictUpload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sessionId", sessionId ?? "demo");
      const res = await fetch("/api/predict-upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Analysis failed");
      return (await res.json()) as PredictResponse;
    },
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message || "Analysis failed."),
  });

  const busy = predict.isPending || predictUpload.isPending;

  // Selecting a clip immediately runs analysis.
  const handleUpload = (r: UploadResult) => {
    setUpload(r);
    setResult(null);
    setAnalysisId((n) => n + 1);
    // Carry this clip so the Compare page can prefill it as "your clip".
    setLast({ file: r.file, previewUrl: r.previewUrl, shot: null });
    if (r.url) predict.mutate(r.url);
    else predictUpload.mutate(r.file);
  };

  const reset = () => {
    setUpload(null);
    setResult(null);
    predict.reset();
    predictUpload.reset();
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-margin pb-lg pt-2xl">
        <div className="absolute inset-0 dotted-grid" />
        <div className="relative z-10 mx-auto max-w-7xl text-center md:text-left">
          <div className="mb-md inline-flex items-center gap-sm rounded-full bg-secondary-container px-md py-xs font-label-caps text-label-caps text-on-secondary-container">
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            AI-POWERED CRICKET COACHING
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl font-display-lg text-3xl font-extrabold tracking-tight text-primary sm:text-display-lg"
          >
            Know which shot you played, <span className="text-secondary">instantly</span>
          </motion.h1>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-margin pb-2xl">
        <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-12">
          {/* Left: upload */}
          <div className="flex flex-col gap-md lg:col-span-5">
            {!upload ? (
              <VideoUploader
                sessionId={sessionId}
                onUploadComplete={handleUpload}
                enableStorage={ENABLE_STORAGE}
              />
            ) : (
              <div className="card overflow-hidden p-md">
                {upload.previewUrl ? (
                  <VideoPlayer src={upload.previewUrl} lazy={false} />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-surface-container font-data-mono text-data-mono text-on-surface-variant">
                    SAMPLE CLIP · NO PREVIEW
                  </div>
                )}
                <div className="mt-md flex items-center justify-between gap-md">
                  <p className="truncate font-data-mono text-data-mono text-on-surface-variant">
                    {upload.fileName}
                  </p>
                  <button onClick={reset} className="btn-ghost py-sm">
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    New clip
                  </button>
                </div>
              </div>
            )}

            {/* Engine status */}
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
              <div className="mb-sm flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">verified</span>
                <span className="label-caps text-primary">Engine Status</span>
              </div>
              <p className="font-data-mono text-data-mono text-on-surface-variant">
                MediaPipe Pose active · biomechanical mesh loaded · 3-shot model
              </p>
            </div>
          </div>

          {/* Right: prediction */}
          <div className="flex flex-col gap-md lg:col-span-7">
            {busy ? (
              <ResultSkeleton />
            ) : result ? (
              <>
                <PredictionResult result={result} />
                <Link href="/compare" className="btn-ghost self-start">
                  <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                  Compare with another video
                </Link>
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        {/* AI Coach — full width below so it has room to breathe */}
        {!busy && result && (
          <div className="mt-lg">
            <CoachCard result={result} analysisId={analysisId} />
          </div>
        )}
      </section>
    </>
  );
}

function EmptyState() {
  return (
    <div className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-xl text-center">
      <div className="absolute inset-0 dotted-grid" />
      <div className="relative z-10">
        <div className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px]">analytics</span>
        </div>
        <h3 className="mb-xs font-headline-md text-headline-md text-primary">Awaiting analysis</h3>
        <p className="mx-auto max-w-xs font-body-md text-body-md text-on-surface-variant">
          Drop a batting clip to get an instant shot prediction, biomechanical
          read-out and AI coaching feedback.
        </p>
      </div>
    </div>
  );
}
