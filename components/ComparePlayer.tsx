"use client";

import { useRef } from "react";
import { VideoPlayer, type VideoPlayerHandle } from "./VideoPlayer";

interface ComparePlayerProps {
  leftSrc: string | null;
  rightSrc: string | null;
  leftLabel: string;
  rightLabel: string;
}

/** Two side-by-side players with synchronized play / pause / restart. */
export function ComparePlayer({
  leftSrc,
  rightSrc,
  leftLabel,
  rightLabel,
}: ComparePlayerProps) {
  const left = useRef<VideoPlayerHandle>(null);
  const right = useRef<VideoPlayerHandle>(null);

  const both = (fn: (h: VideoPlayerHandle | null) => void) => {
    fn(left.current);
    fn(right.current);
  };

  return (
    <div className="space-y-md">
      <div className="grid gap-gutter md:grid-cols-2">
        <Panel label={leftLabel}>
          {leftSrc ? (
            <VideoPlayer ref={left} src={leftSrc} lazy={false} />
          ) : (
            <Placeholder text="No clip — analyse one on the Predict page first." />
          )}
        </Panel>
        <Panel label={rightLabel}>
          {rightSrc ? (
            <VideoPlayer ref={right} src={rightSrc} lazy={false} />
          ) : (
            <Placeholder text="No reference clip available for this shot yet." />
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap justify-center gap-sm">
        <button
          type="button"
          className="btn-success"
          onClick={() => both((h) => h?.play())}
          disabled={!leftSrc && !rightSrc}
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          Play both
        </button>
        <button type="button" className="btn-ghost" onClick={() => both((h) => h?.pause())}>
          <span className="material-symbols-outlined text-[18px]">pause</span>
          Pause
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => both((h) => { h?.seek(0); h?.pause(); })}
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          Restart
        </button>
      </div>
    </div>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-sm">
      <span className="label-caps text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-lg text-center font-body-md text-on-surface-variant">
      {text}
    </div>
  );
}
