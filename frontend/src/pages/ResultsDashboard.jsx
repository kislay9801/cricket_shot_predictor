import { Download, RefreshCw } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import ResultDetails from "../components/ResultDetails";
import ScoreCard from "../components/ScoreCard";
import SimilarityGraph from "../components/SimilarityGraph";
import { API_BASE, fetchResults } from "../lib/api";

export default function ResultsDashboard({ result, setResult }) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!result) {
      fetchResults().then(setResult).catch((err) => setError(err.message));
    }
  }, [result, setResult]);

  function exportReport() {
    if (!result) return;
    window.open(`${API_BASE}${result.report_url}`, "_blank");
  }

  if (error) return <main className="mx-auto max-w-4xl px-5 py-10 text-coral">{error}</main>;
  if (!result) return <main className="mx-auto max-w-4xl px-5 py-10 text-slate-500">Loading latest analysis...</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Results Dashboard</h1>
          <p className="mt-1 text-slate-500">Session {result.session_id} · {result.frame_count} frames · {result.fps} FPS</p>
        </div>
        <div className="flex gap-3">
          <button className="secondary-btn" onClick={() => fetchResults(result.session_id).then(setResult)}><RefreshCw /> Refresh</button>
          <button className="primary-btn" onClick={exportReport}><Download /> Export Report</button>
        </div>
      </div>
      <ScoreCard result={result} />
      <SimilarityGraph values={result.similarity_graph} />
      <ResultDetails result={result} />
    </main>
  );
}
