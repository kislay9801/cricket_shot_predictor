import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Server-side Firebase Admin SDK, used inside API routes to write predictions
 * with elevated privileges. Initialized lazily so a missing service account
 * doesn't crash the build — routes call `getAdminDb()` and handle a null return.
 */

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Vercel/​env stores the key with literal "\n" — convert back to real newlines.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const isAdminConfigured = Boolean(projectId && clientEmail && privateKey);

let adminApp: App | undefined;

function getAdminApp(): App | null {
  if (!isAdminConfigured) return null;
  if (getApps().length) return getApp();
  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}

export function getAdminDb(): Firestore | null {
  const a = getAdminApp();
  return a ? getFirestore(a) : null;
}

export function getAdminBucket() {
  const a = getAdminApp();
  return a ? getStorage(a).bucket() : null;
}
