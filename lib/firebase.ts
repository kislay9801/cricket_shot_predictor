import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * True when the minimum client config is present. The app degrades gracefully
 * (shows a setup banner instead of crashing) when Firebase isn't configured yet.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket,
);

let app: FirebaseApp | undefined;
if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// These are typed as non-null for ergonomic call sites; always gate usage behind
// `isFirebaseConfigured` (the providers/hooks do this for you).
export const firebaseApp = app as FirebaseApp;
export const db = (app ? getFirestore(app) : undefined) as Firestore;
export const storage = (app ? getStorage(app) : undefined) as FirebaseStorage;
export const auth = (app ? getAuth(app) : undefined) as Auth;
