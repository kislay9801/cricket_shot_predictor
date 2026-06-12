import { BarChart3, Camera, Home as HomeIcon, Upload } from "lucide-react";
import React from "react";
import { useState } from "react";
import Home from "./pages/Home";
import ResultsDashboard from "./pages/ResultsDashboard";
import UploadVideo from "./pages/UploadVideo";
import WebcamMatch from "./pages/WebcamMatch";

const nav = [
  ["home", HomeIcon, "Home"],
  ["webcam", Camera, "Webcam"],
  ["upload", Upload, "Upload"],
  ["results", BarChart3, "Results"]
];

export default function App() {
  const [page, setPage] = useState("home");
  const [result, setResult] = useState(null);

  function onResult(payload) {
    setResult(payload);
    setPage("results");
  }

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-panel/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <button onClick={() => setPage("home")} className="flex items-center gap-2 text-left text-lg font-extrabold tracking-tight text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-pitch/12 text-pitch">🏏</span>
            Cricket Pose Matcher
          </button>
          <div className="flex gap-1">
            {nav.map(([key, Icon, label]) => (
              <button key={key} onClick={() => setPage(key)} className={`nav-btn ${page === key ? "active" : ""}`} title={label}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </header>
      {page === "home" && <Home setPage={setPage} />}
      {page === "webcam" && <WebcamMatch onResult={onResult} />}
      {page === "upload" && <UploadVideo onResult={onResult} />}
      {page === "results" && <ResultsDashboard result={result} setResult={setResult} />}
    </div>
  );
}
