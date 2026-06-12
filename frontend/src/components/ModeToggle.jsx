import React from "react";

export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="inline-grid grid-cols-2 rounded-lg border border-line bg-canvas p-1">
      {["batting", "bowling"].map((item) => (
        <button
          key={item}
          onClick={() => setMode(item)}
          className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
            mode === item ? "bg-pitch text-white shadow-sm" : "text-slate-500 hover:text-ink"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
