import { Camera, Trophy, Upload } from "lucide-react";
import React from "react";

export default function Home({ setPage }) {
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-pitch/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-pitch">Sports vision MVP</p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-6xl">Match your cricket technique to the pros</h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Compare your batting or bowling movement against famous player reference poses with MediaPipe landmarks,
          angle matching, wrist trajectory scoring, and coaching feedback.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="primary-btn" onClick={() => setPage("webcam")}><Camera /> Webcam Match</button>
          <button className="secondary-btn" onClick={() => setPage("upload")}><Upload /> Upload Clip</button>
        </div>
      </section>
      <section className="relative min-h-[420px] overflow-hidden rounded-2xl border border-line bg-panel shadow-glow">
        <div className="absolute inset-0 grid place-items-center">
          <div className="pitch-lines">
            <Trophy className="h-16 w-16 text-gold" />
            <span>Pose analytics</span>
          </div>
        </div>
      </section>
    </main>
  );
}
