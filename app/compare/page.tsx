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
import type { CompareResponse } from "@/lib/types";

interface Clip {
  file: File;
  previewUrl: string;
}

export default function ComparePage() {
  const last = useLastAnalysis();
  const [clipA, setClipA] = useState<Clip | null>(
    last.file && last.previewUrl ? { file: last.file, previewUrl: last.previewUrl } : null,
  );
  const [clipB, setClipB] = useState<Clip | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const compare = useMutation({
    mutationFn: async () => {
      if (!clipA || !clipB) throw new Error("Two clips are required");
      const fd = new FormData();
      fd.append("fileA", clipA.file);
      fd.append("fileB", clipB.file);
      const res = await fetch("/api/compare", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Comparison failed");
      return (await res.json()) as CompareResponse;
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
          Upload two clips — ShotSense runs MediaPipe pose on both and scores how
          closely their technique matches.
        </p>
      </div>

      {/* Two slots */}
      <div className="grid gap-gutter md:grid-cols-2">
        <Slot
          index="01"
          title="Your clip"
          clip={clipA}
          onPick={(c) => { setClipA(c); setResult(null); }}
        />
        <Slot
          index="02"
          title="Comparison clip"
          clip={clipB}
          onPick={(c) => { setClipB(c); setResult(null); }}
        />
      </div>

      <div className="mt-lg flex flex-wrap items-center gap-md">
        <button
          onClick={() => compare.mutate()}
          disabled={!clipA || !clipB || compare.isPending}
          className="btn-success"
        >
          <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
          {compare.isPending ? "Analyzing…" : "Run comparison"}
        </button>
        {!last.file && (
          <Link href="/" className="font-data-mono text-data-mono text-on-surface-variant hover:text-secondary">
            ← analyse a shot first to auto-fill clip 01
          </Link>
        )}
      </div>

      {/* Result */}
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

function ResultPanel({ result }: { result: CompareResponse }) {
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
        {result.lowSignal && (
          <p className="mt-md font-data-mono text-[11px] uppercase text-error">
            Low pose detection on one clip — result may be unreliable.
          </p>
        )}
      </div>
    </motion.div>
  );
}
