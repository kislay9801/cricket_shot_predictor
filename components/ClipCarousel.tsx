"use client";

import { useState } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { Skeleton } from "./SkeletonLoader";
import { useShotClips } from "@/lib/queries";

interface ClipCarouselProps {
  shotId: string;
}

export function ClipCarousel({ shotId }: ClipCarouselProps) {
  const { data: clips, isLoading } = useShotClips(shotId);
  const [index, setIndex] = useState(0);

  if (isLoading) return <Skeleton className="aspect-video w-full rounded-lg" />;

  if (!clips || clips.length === 0) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-center font-data-mono text-data-mono text-on-surface-variant">
        <span className="material-symbols-outlined mb-sm text-[28px] text-outline-variant">
          videocam_off
        </span>
        NO EXAMPLE CLIPS YET
      </div>
    );
  }

  const current = clips[Math.min(index, clips.length - 1)];

  return (
    <div className="space-y-sm">
      <VideoPlayer key={current.id} src={current.clipUrl} />
      <div className="flex items-center justify-between">
        <p className="font-body-md text-on-surface">{current.label}</p>
        {clips.length > 1 && (
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + clips.length) % clips.length)}
              className="text-on-surface-variant hover:text-secondary"
              aria-label="Previous clip"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-data-mono text-data-mono text-on-surface-variant">
              {index + 1}/{clips.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % clips.length)}
              className="text-on-surface-variant hover:text-secondary"
              aria-label="Next clip"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
