import { Loader2, Lock, Mail, User, X } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export default function AuthModal({ open, mode = "signin", onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (open) {
      setTab(mode);
      setError("");
    }
  }, [open, mode]);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "signup") await signUp(email, password, name);
      else await signIn(email, password);
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-soft animate-pop">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-ink" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-ink">
          {tab === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {tab === "signup" ? "Track your sessions and get AI coaching." : "Sign in to see your stats and history."}
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-lg border border-line bg-canvas p-1 text-sm font-semibold">
          {["signin", "signup"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-2 transition ${tab === t ? "bg-pitch text-white shadow-sm" : "text-slate-500 hover:text-ink"}`}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {tab === "signup" && (
            <Field icon={User} type="text" placeholder="Full name" value={name} onChange={setName} required />
          )}
          <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} required />
          <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} required />

          {error && <p className="rounded-lg border border-coral/40 bg-coral/10 p-2.5 text-sm text-coral">{error}</p>}

          <button disabled={loading} className="primary-btn w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tab === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <button onClick={google} disabled={loading} className="secondary-btn w-full justify-center">
          <GoogleGlyph /> Continue with Google
        </button>
      </div>
    </div>
  );
}

function Field({ icon: Icon, type, placeholder, value, onChange, required }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 focus-within:border-pitch focus-within:ring-2 focus-within:ring-pitch/15">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 2.9 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}
