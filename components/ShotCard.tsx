"use client";

import { motion } from "framer-motion";
import { CATEGORY_LABELS, type Shot } from "@/lib/types";

const CATEGORY_ICON: Record<string, string> = {
  attacking: "sports_cricket",
  defensive: "shield",
  spin: "cyclone",
  pace: "bolt",
};

interface ShotCardProps {
  shot: Shot;
  onClick: (shot: Shot) => void;
}

export function ShotCard({ shot, onClick }: ShotCardProps) {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onClick(shot)}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-left transition-shadow hover:shadow-soft-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-container">
        {shot.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot.thumbnailUrl}
            alt={shot.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high">
            <span className="material-symbols-outlined text-[40px] text-outline-variant">
              {CATEGORY_ICON[shot.category] ?? "sports_cricket"}
            </span>
          </div>
        )}
        <div className="absolute right-sm top-sm rounded-sm bg-primary/85 px-sm py-xs font-label-caps text-[10px] uppercase tracking-widest text-on-primary">
          {CATEGORY_LABELS[shot.category]}
        </div>
      </div>
      <div className="p-md">
        <div className="mb-xs flex items-start justify-between">
          <h3 className="font-headline-md text-headline-md text-primary">{shot.name}</h3>
          <span className="material-symbols-outlined text-outline transition-colors group-hover:text-secondary">
            analytics
          </span>
        </div>
        <p className="line-clamp-2 font-body-md text-body-md text-on-surface-variant">
          {shot.description}
        </p>
        <div className="mt-md flex items-center justify-between border-t border-outline-variant pt-md">
          <span className="font-data-mono text-data-mono text-secondary">
            {CATEGORY_LABELS[shot.category]}
          </span>
          <span className="font-data-mono text-data-mono text-outline">View ›</span>
        </div>
      </div>
    </motion.button>
  );
}
