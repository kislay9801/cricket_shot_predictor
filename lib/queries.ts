"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { SHOTS } from "./shots-data";
import type { Shot, ShotClip, Prediction } from "./types";

function toMillis(v: unknown): number | null {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  return null;
}

/** All shots, ordered by `order`. Falls back to the local catalog if Firestore
 *  isn't configured or the collection is empty (so the UI is never blank). */
export function useShots() {
  return useQuery<Shot[]>({
    queryKey: ["shots"],
    queryFn: async () => {
      if (!isFirebaseConfigured) return SHOTS;
      const snap = await getDocs(
        query(collection(db, "shots"), orderBy("order", "asc")),
      );
      if (snap.empty) return SHOTS;
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shot);
    },
  });
}

/** Example clips for a shot, newest first. */
export function useShotClips(shotId: string | null) {
  return useQuery<ShotClip[]>({
    queryKey: ["shotClips", shotId],
    enabled: Boolean(shotId) && isFirebaseConfigured,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "shotClips"), where("shotId", "==", shotId)),
      );
      return snap.docs
        .map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
              createdAt: toMillis(d.data().createdAt),
            }) as ShotClip,
        )
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
  });
}

/** A single user's prediction history (sorted client-side to avoid a composite index). */
export function usePredictions(sessionId: string | null) {
  return useQuery<Prediction[]>({
    queryKey: ["predictions", sessionId],
    enabled: Boolean(sessionId) && isFirebaseConfigured,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "predictions"),
          where("sessionId", "==", sessionId),
        ),
      );
      return snap.docs
        .map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
              createdAt: toMillis(d.data().createdAt),
            }) as Prediction,
        )
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
  });
}

export function useDeletePrediction(sessionId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (predictionId: string) => {
      await deleteDoc(doc(db, "predictions", predictionId));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions", sessionId] });
    },
  });
}
