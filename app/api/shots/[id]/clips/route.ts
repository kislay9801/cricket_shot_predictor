import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ShotClip } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/shots/[id]/clips — example clips for a shot. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const adminDb = getAdminDb();
  if (!adminDb) return NextResponse.json([]);

  try {
    const snap = await adminDb
      .collection("shotClips")
      .where("shotId", "==", params.id)
      .get();
    const clips = snap.docs.map((d) => {
      const data = d.data();
      const createdAt =
        data.createdAt && typeof data.createdAt.toMillis === "function"
          ? data.createdAt.toMillis()
          : null;
      return { id: d.id, ...data, createdAt } as ShotClip;
    });
    clips.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return NextResponse.json(clips);
  } catch (err) {
    console.error("Failed to read clips:", err);
    return NextResponse.json([]);
  }
}
