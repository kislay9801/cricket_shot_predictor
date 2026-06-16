"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "signin" | "signup";

function friendly(code: string): string {
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Incorrect email or password.";
  if (code.includes("email-already-in-use")) return "That email is already registered — try signing in.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "Please enter a valid email.";
  if (code.includes("popup-closed")) return "Sign-in was cancelled.";
  if (code.includes("operation-not-allowed"))
    return "This sign-in method isn't enabled in Firebase yet.";
  return "Something went wrong. Please try again.";
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const done = (msg: string) => {
    toast.success(msg);
    setEmail("");
    setPassword("");
    setBusy(false);
    onClose();
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) return toast.error("Firebase isn't configured.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = EmailAuthProvider.credential(email, password);
        const current = auth.currentUser;
        if (current?.isAnonymous) {
          // Upgrade the anonymous account → keeps the same uid (and history).
          try {
            await linkWithCredential(current, cred);
            return done("Account created");
          } catch (err: any) {
            if (err?.code?.includes("email-already-in-use")) {
              await signInWithEmailAndPassword(auth, email, password);
              return done("Signed in");
            }
            throw err;
          }
        }
        await createUserWithEmailAndPassword(auth, email, password);
        return done("Account created");
      }
      await signInWithEmailAndPassword(auth, email, password);
      done("Signed in");
    } catch (err: any) {
      toast.error(friendly(err?.code ?? ""));
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (!isFirebaseConfigured) return toast.error("Firebase isn't configured.");
    setBusy(true);
    const provider = new GoogleAuthProvider();
    try {
      const current = auth.currentUser;
      if (current?.isAnonymous) {
        try {
          await linkWithPopup(current, provider);
          return done("Signed in with Google");
        } catch (err: any) {
          if (err?.code?.includes("credential-already-in-use")) {
            await signInWithPopup(auth, provider);
            return done("Signed in with Google");
          }
          throw err;
        }
      }
      await signInWithPopup(auth, provider);
      done("Signed in with Google");
    } catch (err: any) {
      toast.error(friendly(err?.code ?? ""));
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-10 w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest shadow-modal"
          >
            <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">sports_cricket</span>
                <h2 className="font-headline-md text-headline-md font-bold text-primary">
                  {mode === "signin" ? "Sign in" : "Create account"}
                </h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-md p-lg">
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="btn-ghost w-full"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                Continue with Google
              </button>

              <div className="flex items-center gap-sm">
                <div className="h-px flex-1 bg-outline-variant" />
                <span className="font-data-mono text-[11px] uppercase text-outline">or</span>
                <div className="h-px flex-1 bg-outline-variant" />
              </div>

              <form onSubmit={handleEmail} className="space-y-md">
                <div>
                  <label className="label-caps mb-xs block text-on-surface-variant">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label-caps mb-xs block text-on-surface-variant">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="text-center font-body-md text-body-md text-on-surface-variant">
                {mode === "signin" ? "New to ShotSense? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-bold text-secondary hover:underline"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
