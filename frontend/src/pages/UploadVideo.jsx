import { Loader2, UploadCloud } from "lucide-react";
import React from "react";
import { useState } from "react";
import ModeToggle from "../components/ModeToggle";
import { uploadVideo } from "../lib/api";

export default function UploadVideo({ onResult }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("batting");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Choose a cricket video clip first.");
    setLoading(true);
    setError("");
    try {
      onResult(await uploadVideo(file, mode));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <form onSubmit={submit} className="panel">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Upload Video</h1>
            <p className="text-slate-400">MP4, MOV, AVI, MKV, or WEBM with a visible full-body player works best.</p>
          </div>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        <label className="grid min-h-72 cursor-pointer place-items-center rounded-md border-2 border-dashed border-line bg-ink/70 p-8 text-center hover:border-pitch">
          <input type="file" accept="video/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0])} />
          <div>
            <UploadCloud className="mx-auto mb-4 h-12 w-12 text-pitch" />
            <p className="text-xl font-bold text-white">{file ? file.name : "Select cricket clip"}</p>
            <p className="mt-2 text-slate-400">The backend samples frames, detects landmarks, aligns sequences, and ranks references.</p>
          </div>
        </label>
        {error && <p className="mt-4 rounded-md border border-coral/50 bg-coral/10 p-3 text-coral">{error}</p>}
        <button disabled={loading} className="primary-btn mt-6">
          {loading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          Analyze Video
        </button>
      </form>
    </main>
  );
}
