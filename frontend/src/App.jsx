import { BarChart3, Camera, Home as HomeIcon, LogOut, Upload } from "lucide-react";
import React, { useState } from "react";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./lib/auth";
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
  const { user, signOut } = useAuth();
  const [page, setPage] = useState("home");
  const [result, setResult] = useState(null);
  const [auth, setAuth] = useState({ open: false, mode: "signin" });

  function onResult(payload) {
    setResult(payload);
    setPage("results");
  }

  function openAuth(mode) {
    setAuth({ open: true, mode });
  }

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-panel/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <button onClick={() => setPage("home")} className="flex items-center gap-2 text-left text-lg font-extrabold tracking-tight text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-pitch/12 text-pitch">🏏</span>
            <span className="hidden sm:inline">Cricket Pose Matcher</span>
          </button>

          <div className="flex items-center gap-1">
            {nav.map(([key, Icon, label]) => (
              <button key={key} onClick={() => setPage(key)} className={`nav-btn ${page === key ? "active" : ""}`} title={label}>
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-pitch/12 text-sm font-bold text-pitch" title={user.email}>
                  {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-ink sm:inline">{user.displayName}</span>
                <button onClick={signOut} className="nav-btn" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("signin")} className="secondary-btn px-3 py-2 text-sm">Sign In</button>
                <button onClick={() => openAuth("signup")} className="primary-btn px-3 py-2 text-sm">Sign Up</button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* key forces a fresh mount per page so the entrance animation replays */}
      <div key={page} className="animate-rise">
        {page === "home" && <Home setPage={setPage} />}
        {page === "webcam" && <WebcamMatch onResult={onResult} />}
        {page === "upload" && <UploadVideo onResult={onResult} />}
        {page === "results" && <ResultsDashboard result={result} setResult={setResult} />}
      </div>

      <AuthModal open={auth.open} mode={auth.mode} onClose={() => setAuth({ ...auth, open: false })} />
    </div>
  );
}
