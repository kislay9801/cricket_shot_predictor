"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  element: HTMLVideoElement | null;
}

interface VideoPlayerProps {
  src: string;
  /** lazy-load the video metadata/poster until in view */
  lazy?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

/** Lightweight custom-chrome video player for Firebase Storage URLs. */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, lazy = true, className = "", onPlay, onPause }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (t: number) => {
        if (videoRef.current) videoRef.current.currentTime = t;
      },
      element: videoRef.current,
    }));

    const toggle = () => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play();
      else v.pause();
    };

    const onTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };

    const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      v.currentTime = pct * v.duration;
    };

    return (
      <div
        className={`group relative overflow-hidden rounded-lg bg-black ${className}`}
      >
        <video
          ref={videoRef}
          src={src}
          preload={lazy ? "metadata" : "auto"}
          playsInline
          className="aspect-video w-full bg-black object-contain"
          onTimeUpdate={onTimeUpdate}
          onPlay={() => {
            setPlaying(true);
            onPlay?.();
          }}
          onPause={() => {
            setPlaying(false);
            onPause?.();
          }}
          onClick={toggle}
        />

        {/* Center play button */}
        {!playing && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Play"
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-modal transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-secondary">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}

        {/* Progress bar */}
        <div className="absolute inset-x-0 bottom-0 p-2">
          <div
            className="h-1.5 cursor-pointer rounded-full bg-white/30"
            onClick={onSeekClick}
          >
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  },
);
