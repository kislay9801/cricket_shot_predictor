import React from "react";
import { API_BASE } from "../lib/api";

export default function ResultDetails({ result }) {
  if (!result) return null;
  return (
    <div className="stagger grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="panel">
        <h2 className="section-title">Top 3 Matches</h2>
        <div className="mt-4 space-y-3">
          {(result.top_matches || []).map((match, index) => (
            <div key={match.player} className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-3">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-pitch/10 text-sm font-bold text-pitch">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{match.player}</p>
                <p className="text-sm capitalize text-slate-500">{match.shot_type}</p>
              </div>
              <strong className="text-lg text-gold">{match.score}%</strong>
            </div>
          ))}
          {(!result.top_matches || result.top_matches.length === 0) && (
            <p className="rounded-lg border border-line bg-canvas p-3 text-slate-500">No confident player match for this shot yet.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Shot Classification</h2>
        <div className="mt-4 space-y-3">
          {(result.top_shots || []).map((shot, index) => (
            <div key={shot.shot_slug || shot.shot_type} className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-3">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-pitch/10 text-sm font-bold text-pitch">{index + 1}</span>
              <p className="flex-1 capitalize text-ink">{shot.shot_type}</p>
              <strong className="text-lg text-gold">{shot.score}%</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Similarity Breakdown</h2>
        <div className="mt-4 space-y-3">
          {Object.entries(result.similarity_breakdown || {}).map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm capitalize text-slate-600">
                <span>{key.replace("_", " ")}</span>
                <span className="font-semibold text-ink">{value}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-pitch transition-[width] duration-700 ease-out" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
          {(!result.similarity_breakdown || Object.keys(result.similarity_breakdown).length === 0) && (
            <p className="rounded-lg border border-line bg-canvas p-3 text-slate-500">Add real references for this shot to unlock detailed player breakdown.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Coaching Feedback</h2>
        <div className="mt-4 space-y-3">
          {result.coaching_feedback.map((tip) => (
            <p key={tip} className="rounded-lg border border-line bg-canvas p-3 text-slate-700">{tip}</p>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Pose Overlay Frames</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(result.overlay_frames || []).map((src) => (
            <img key={src} src={`${API_BASE}${src}`} alt="Pose skeleton overlay" className="aspect-video rounded-lg border border-line object-cover" />
          ))}
        </div>
      </section>
    </div>
  );
}
