/**
 * Seeds the Firestore `shots` collection with the canonical shot catalog.
 *
 * Usage:
 *   1. Fill in FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 *      in .env.local (service account — see README).
 *   2. npx ts-node scripts/seed-firebase.ts
 *      (or: npm run seed)
 */
import * as dotenv from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { SHOTS } from "../lib/shots-data";

dotenv.config({ path: ".env.local" });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "\n✗ Missing Firebase Admin credentials.\n" +
      "  Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local.\n",
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function seed() {
  console.log(`Seeding ${SHOTS.length} shots into Firestore…`);
  const batch = db.batch();

  for (const shot of SHOTS) {
    const ref = db.collection("shots").doc(shot.id);
    batch.set(ref, {
      name: shot.name,
      category: shot.category,
      description: shot.description,
      techniqueNotes: shot.techniqueNotes,
      commonMistakes: shot.commonMistakes,
      thumbnailUrl: shot.thumbnailUrl,
      order: shot.order,
    });
    console.log(`  • ${shot.order.toString().padStart(2, " ")}. ${shot.name}`);
  }

  await batch.commit();
  console.log(`\n✓ Seeded ${SHOTS.length} shots successfully.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("✗ Seeding failed:", err);
  process.exit(1);
});
