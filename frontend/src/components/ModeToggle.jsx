import React from "react";

export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="inline-grid grid-cols-2 rounded-md border border-line bg-ink p-1">
      {["batting", "bowling"].map((item) => (
        <button
          key={item}
          onClick={() => setMode(item)}
          className={`rounded px-4 py-2 text-sm font-semibold capitalize transition ${
            mode === item ? "bg-pitch text-ink" : "text-slate-300 hover:text-white"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
