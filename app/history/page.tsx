"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useSession } from "@/lib/session";
import { usePredictions, useDeletePrediction } from "@/lib/queries";
import { Skeleton } from "@/components/SkeletonLoader";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { Prediction } from "@/lib/types";

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toCsv(rows: Prediction[]): string {
  const header = ["Predicted shot", "Confidence (%)", "Date", "Video URL"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [esc(r.predictedShot), r.confidence, esc(formatDate(r.createdAt)), esc(r.videoUrl)].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export default function HistoryPage() {
  const { sessionId, ready } = useSession();
  const { data: predictions, isLoading } = usePredictions(sessionId);
  const del = useDeletePrediction(sessionId);

  const stats = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;
    const total = predictions.length;
    const avg = (predictions.reduce((s, p) => s + p.confidence, 0) / total).toFixed(1);
    const counts: Record<string, number> = {};
    for (const p of predictions) counts[p.predictedShot] = (counts[p.predictedShot] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { total, avg, topShot: top[0] };
  }, [predictions]);

  const exportCsv = () => {
    if (!predictions?.length) return;
    const blob = new Blob([toCsv(predictions)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shotsense-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("History exported");
  };

  if (!isFirebaseConfigured) {
    return (
      <Wrapper>
        <Empty text="History needs Firebase configured. Add your keys to .env.local to start tracking analyses." />
      </Wrapper>
    );
  }

  const loading = isLoading || !ready;

  return (
    <Wrapper>
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="mb-sm font-headline-lg text-headline-lg text-primary">
            Performance History
          </h1>
          <p className="font-body-md text-on-surface-variant">
            Archived swing analysis and biomechanical logs for technique refinement.
          </p>
        </div>
        <button onClick={exportCsv} disabled={!predictions?.length} className="btn-ghost">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export
        </button>
      </div>

      {stats && (
        <div className="mb-xl grid grid-cols-1 gap-gutter sm:grid-cols-3">
          <StatCard label="Total Analyses" value={String(stats.total)} icon="analytics" />
          <StatCard label="Average Confidence" value={`${stats.avg}%`} icon="target" accent />
          <StatCard label="Top Shot" value={stats.topShot} icon="sports_cricket" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant px-lg py-md">
          <h2 className="font-headline-md text-headline-md text-primary">Analysis Archive</h2>
        </div>

        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-none" />
            ))}
          </div>
        ) : !predictions?.length ? (
          <Empty text="No analyses yet. Head to Predict and analyse your first clip." />
        ) : (
          <>
            {/* header row */}
            <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-lg border-b border-outline-variant px-lg py-sm md:grid">
              <span className="label-caps text-outline">Shot</span>
              <span className="label-caps w-24 text-right text-outline">Confidence</span>
              <span className="label-caps w-24 text-right text-outline">Date</span>
              <span className="label-caps w-10 text-outline" />
            </div>
            {predictions.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-[1fr_auto] items-center gap-md border-b border-outline-variant px-lg py-md last:border-b-0 md:grid-cols-[1fr_auto_auto_auto] md:gap-lg"
              >
                <div className="flex items-center gap-md">
                  <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-container">
                    {p.videoUrl ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={p.videoUrl} preload="metadata" muted className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px] text-outline">sports_cricket</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-body-md font-bold text-primary">{p.predictedShot}</p>
                    <p className="font-data-mono text-[11px] uppercase text-outline">
                      ID: {p.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-md md:contents">
                  <span className="status-chip w-24 justify-center bg-secondary-container/60 font-data-mono text-on-secondary-container md:justify-end md:bg-transparent">
                    {p.confidence}%
                  </span>
                  <span className="hidden w-24 text-right font-data-mono text-data-mono text-on-surface-variant md:block">
                    {formatDate(p.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      del.mutate(p.id, {
                        onSuccess: () => toast.success("Deleted"),
                        onError: () => toast.error("Could not delete"),
                      })
                    }
                    disabled={del.isPending}
                    aria-label="Delete"
                    className="w-10 text-outline transition-colors hover:text-error"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-margin py-xl">{children}</div>;
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-sm flex items-center justify-between">
        <span className="label-caps text-outline">{label}</span>
        <span className={`material-symbols-outlined text-[20px] ${accent ? "text-secondary" : "text-outline"}`}>
          {icon}
        </span>
      </div>
      <p className={`font-data-mono text-headline-lg font-bold ${accent ? "text-secondary" : "text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-2xl text-center">
      <span className="material-symbols-outlined mb-md text-[40px] text-outline-variant">history</span>
      <p className="max-w-sm font-body-md text-on-surface-variant">{text}</p>
    </div>
  );
}
