import { Camera, Trophy, Upload } from "lucide-react";
import React from "react";

export default function Home({ setPage }) {
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section>
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-pitch">Sports vision MVP</p>
        <h1 className="max-w-3xl text-5xl font-black leading-tight text-white md:text-7xl">Cricket Pose Matcher</h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          Compare your batting or bowling movement against famous player reference poses with MediaPipe landmarks,
          angle matching, wrist trajectory scoring, and coaching feedback.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="primary-btn" onClick={() => setPage("webcam")}><Camera /> Webcam Match</button>
          <button className="secondary-btn" onClick={() => setPage("upload")}><Upload /> Upload Clip</button>
        </div>
      </section>
      <section className="relative min-h-[420px] overflow-hidden rounded-lg border border-line bg-panel shadow-glow">
        <div className="absolute inset-0 grid place-items-center">
          <div className="pitch-lines">
            <Trophy className="h-20 w-20 text-gold" />
            <span>Pose analytics</span>
          </div>
        </div>
      </section>
    </main>
  );
}
