import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Auth context — Firebase-ready.
 *
 * Right now this uses a lightweight localStorage "mock" so the UI works without
 * any backend/keys. When you add Firebase, you only need to swap the four impl
 * functions below (signUp / signIn / signInWithGoogle / signOut) and the initial
 * `onAuthStateChanged` subscription. The component API (useAuth) stays identical,
 * so nothing in the UI has to change.
 *
 * --- Firebase swap (after `npm install firebase`) ---
 *   import { initializeApp } from "firebase/app";
 *   import {
 *     getAuth, onAuthStateChanged, signOut as fbSignOut,
 *     createUserWithEmailAndPassword, signInWithEmailAndPassword,
 *     updateProfile, GoogleAuthProvider, signInWithPopup,
 *   } from "firebase/auth";
 *   const app = initializeApp({
 *     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
 *     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 *     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
 *     appId: import.meta.env.VITE_FIREBASE_APP_ID,
 *   });
 *   const auth = getAuth(app);
 *   // then replace the mock bodies with the matching Firebase calls and use
 *   // onAuthStateChanged(auth, setUser) in the effect.
 */

const AuthContext = createContext(null);
const STORAGE_KEY = "cpm_user";

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state. (Firebase: replace with onAuthStateChanged.)
  useEffect(() => {
    setUser(loadStoredUser());
    setLoading(false);
  }, []);

  function persist(nextUser) {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(
    () => ({
      user,
      loading,

      async signUp(email, password, name) {
        // Firebase: createUserWithEmailAndPassword(...) then updateProfile.
        const nextUser = { uid: `local-${email}`, email, displayName: name || email.split("@")[0] };
        persist(nextUser);
        return nextUser;
      },

      async signIn(email, password) {
        // Firebase: signInWithEmailAndPassword(auth, email, password).
        const nextUser = { uid: `local-${email}`, email, displayName: email.split("@")[0] };
        persist(nextUser);
        return nextUser;
      },

      async signInWithGoogle() {
        // Firebase: signInWithPopup(auth, new GoogleAuthProvider()).
        const nextUser = { uid: "local-google", email: "you@gmail.com", displayName: "Google User" };
        persist(nextUser);
        return nextUser;
      },

      async signOut() {
        // Firebase: fbSignOut(auth).
        persist(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
