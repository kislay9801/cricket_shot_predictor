import React from "react";

export default function SimilarityGraph({ values = [] }) {
  const width = 720;
  const height = 170;
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - (Math.max(0, Math.min(value, 100)) / 100) * height;
    return `${x},${y}`;
  });

  return (
    <div className="panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">Frame Similarity</h2>
        <span className="text-sm text-slate-400">{values.length} aligned frames</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible">
        {[25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1="0"
            x2={width}
            y1={height - (tick / 100) * height}
            y2={height - (tick / 100) * height}
            stroke="#26383e"
            strokeWidth="1"
          />
        ))}
        <polyline points={points.join(" ")} fill="none" stroke="#16c47f" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
