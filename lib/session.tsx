"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

const STORAGE_KEY = "shotsense_session_id";

interface SessionState {
  user: User | null;
  sessionId: string | null;
  /** true when the only session is an anonymous (not signed-up) one */
  isAnonymous: boolean;
  ready: boolean;
  configured: boolean;
}

const SessionContext = createContext<SessionState>({
  user: null,
  sessionId: null,
  isAnonymous: true,
  ready: false,
  configured: false,
});

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(readStored);
  const [ready, setReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setSessionId(u.uid);
        try {
          window.localStorage.setItem(STORAGE_KEY, u.uid);
        } catch {
          /* ignore */
        }
        setReady(true);
      } else {
        // Keep a working session for uploads/history even before sign-up.
        signInAnonymously(auth).catch(() => setReady(true));
      }
    });
    return () => unsub();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        user,
        sessionId,
        isAnonymous: !user || user.isAnonymous,
        ready,
        configured: isFirebaseConfigured,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
