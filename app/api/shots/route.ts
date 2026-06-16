import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { SHOTS } from "@/lib/shots-data";
import type { Shot } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/shots — all shots ordered by `order`. Falls back to the local
 *  catalog when Firestore isn't configured or is empty. */
export async function GET() {
  const adminDb = getAdminDb();
  if (!adminDb) return NextResponse.json(SHOTS);

  try {
    const snap = await adminDb.collection("shots").orderBy("order", "asc").get();
    if (snap.empty) return NextResponse.json(SHOTS);
    const shots = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shot);
    return NextResponse.json(shots);
  } catch (err) {
    console.error("Failed to read shots:", err);
    return NextResponse.json(SHOTS);
  }
}
