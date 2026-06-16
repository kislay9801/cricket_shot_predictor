"use client";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "./firebase";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/avi",
];
export const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".avi"];

export interface UploadHandle {
  promise: Promise<{ url: string; path: string }>;
  cancel: () => void;
}

/**
 * Resumable upload of a user clip to /user-uploads/{sessionId}/{timestamp}.{ext}.
 * Returns a handle exposing progress (via onProgress callback) and a cancel fn.
 */
export function uploadUserVideo(
  file: File,
  sessionId: string,
  onProgress?: (pct: number) => void,
): UploadHandle {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `user-uploads/${sessionId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "video/mp4",
  });

  const promise = new Promise<{ url: string; path: string }>(
    (resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          onProgress?.(pct);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path });
        },
      );
    },
  );

  return { promise, cancel: () => task.cancel() };
}

export function validateVideoFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  const typeOk =
    ACCEPTED_VIDEO_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.includes(ext);
  if (!typeOk) {
    return "Unsupported format. Please upload an .mp4, .mov, or .avi file.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File is too large. Maximum size is 50MB.";
  }
  return null;
}
