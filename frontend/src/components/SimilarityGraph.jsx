import React from "react";

export default function SimilarityGraph({ values = [] }) {
  const width = 720;
  const height = 170;
  const coords = values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - (Math.max(0, Math.min(value, 100)) / 100) * height;
    return [x, y];
  });
  const points = coords.map(([x, y]) => `${x},${y}`);
  const areaPath =
    coords.length > 0
      ? `M0,${height} ${points.join(" ")} L${width},${height} Z`
      : "";

  return (
    <div className="panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">Frame Similarity</h2>
        <span className="text-sm text-slate-500">{values.length} aligned frames</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible">
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f9d63" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0f9d63" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1="0"
            x2={width}
            y1={height - (tick / 100) * height}
            y2={height - (tick / 100) * height}
            stroke="#eef2f6"
            strokeWidth="1"
          />
        ))}
        {areaPath && <path d={areaPath} fill="url(#fillGrad)" />}
        <polyline points={points.join(" ")} fill="none" stroke="#0f9d63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
