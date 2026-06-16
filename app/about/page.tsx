"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { icon: "upload", title: "Upload", body: "Drop an MP4/MOV/AVI clip — analysed directly by the AI engine." },
  { icon: "view_in_ar", title: "Pose extraction", body: "MediaPipe samples key frames and tracks 33 body landmarks." },
  { icon: "neurology", title: "ML inference", body: "Biomechanical features classify the shot among the trained set." },
  { icon: "insights", title: "Result + coach", body: "Get the shot, confidence, indicators and AI coaching feedback." },
];

const ACCURACY = [
  { label: "Shots recognised", value: "3" },
  { label: "CV accuracy", value: "78.6%" },
  { label: "Avg analysis", value: "<6s" },
];

const FAQS = [
  { q: "How accurate is ShotSense?", a: "The pose model is trained on real batting clips and scores ~79% leave-one-out accuracy across Cover Drive, Pull Shot and Straight Drive. More shot types are coming as the dataset grows." },
  { q: "Do I need an account?", a: "No. ShotSense uses anonymous sessions, so your history is tied to your device without any sign-up." },
  { q: "What video formats are supported?", a: "MP4, MOV and AVI up to 50MB. For best results use a clear side-on or front-on clip of a single shot." },
  { q: "How does the AI coach work?", a: "It combines the model's read-out with the shot's reference technique to generate personalised feedback via Google Gemini, with a rule-based fallback." },
];

export default function AboutPage() {
  return (
    <div className="relative">
      <div className="absolute inset-0 dotted-grid pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-7xl space-y-2xl px-margin py-xl">
        <header>
          <h1 className="mb-sm font-headline-lg text-headline-lg text-primary">About ShotSense</h1>
          <p className="max-w-2xl font-body-md text-on-surface-variant">
            ShotSense turns a short batting clip into instant shot recognition and
            biomechanical coaching — built for players and coaches on the field.
          </p>
        </header>

        <section>
          <h2 className="mb-lg label-caps text-secondary">How it works</h2>
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card p-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                </div>
                <p className="mt-md font-body-md font-bold text-primary">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-xs font-body-md text-on-surface-variant">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-lg label-caps text-secondary">By the numbers</h2>
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-3">
            {ACCURACY.map((a) => (
              <div key={a.label} className="card p-lg text-center">
                <p className="font-data-mono text-display-lg font-extrabold text-secondary">{a.value}</p>
                <p className="mt-xs font-body-md text-on-surface-variant">{a.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-lg label-caps text-secondary">FAQ</h2>
          <div className="space-y-sm">
            {FAQS.map((f) => (
              <Accordion key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-md px-lg py-md text-left"
      >
        <span className="font-body-md font-bold text-primary">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-secondary">
          <span className="material-symbols-outlined">add</span>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="px-lg pb-md font-body-md leading-relaxed text-on-surface-variant">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
