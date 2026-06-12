import { Camera, Loader2 } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";
import ModeToggle from "../components/ModeToggle";
import { sendWebcamFrame } from "../lib/api";

export default function WebcamMatch({ onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState("batting");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 960, height: 540 }, audio: false })
      .then((mediaStream) => {
        stream = mediaStream;
        videoRef.current.srcObject = mediaStream;
      })
      .catch(() => setError("Webcam permission denied or unavailable."));
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, []);

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 540;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setLoading(true);
    setError("");
    try {
      onResult(await sendWebcamFrame(canvas.toDataURL("image/jpeg", 0.9), mode));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Webcam Pose Match</h1>
          <p className="text-slate-400">Stand side-on with your full body in frame, then capture a key pose.</p>
        </div>
        <ModeToggle mode={mode} setMode={setMode} />
      </div>
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-line bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <aside className="panel">
          <h2 className="section-title">Live Analyzer</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>Single-frame webcam matching is fastest for live checks.</p>
            <p>For richer wrist trajectory scoring, use the upload mode with a short action clip.</p>
          </div>
          {error && <p className="mt-4 rounded-md border border-coral/50 bg-coral/10 p-3 text-coral">{error}</p>}
          <button onClick={capture} disabled={loading} className="primary-btn mt-6 w-full justify-center">
            {loading ? <Loader2 className="animate-spin" /> : <Camera />}
            Capture Pose
          </button>
        </aside>
      </section>
    </main>
  );
}
