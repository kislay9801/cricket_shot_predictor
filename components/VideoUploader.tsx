"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import toast from "react-hot-toast";
import {
  uploadUserVideo,
  validateVideoFile,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage";
import { isFirebaseConfigured } from "@/lib/firebase";

export interface UploadResult {
  url: string;
  path: string;
  previewUrl: string;
  fileName: string;
  file: File;
}

interface VideoUploaderProps {
  sessionId: string | null;
  onUploadComplete: (result: UploadResult) => void;
  disabled?: boolean;
  enableStorage?: boolean;
}

export function VideoUploader({
  sessionId,
  onUploadComplete,
  disabled,
  enableStorage = false,
}: VideoUploaderProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateVideoFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      const previewUrl = URL.createObjectURL(file);

      if (!enableStorage) {
        onUploadComplete({ url: "", path: "", previewUrl, fileName: file.name, file });
        return;
      }
      if (!isFirebaseConfigured) {
        toast.error("Firebase Storage isn't configured. See the README setup.");
        return;
      }
      if (!sessionId) {
        toast.error("Session not ready yet — please wait a moment and retry.");
        return;
      }

      setFileName(file.name);
      setProgress(0);
      try {
        const { promise } = uploadUserVideo(file, sessionId, (pct) => setProgress(pct));
        const { url, path } = await promise;
        setProgress(100);
        onUploadComplete({ url, path, previewUrl, fileName: file.name, file });
        toast.success("Clip uploaded");
      } catch (err) {
        console.error(err);
        toast.error("Upload failed. Check your connection and try again.");
        setProgress(null);
        setFileName(null);
        URL.revokeObjectURL(previewUrl);
      }
    },
    [sessionId, onUploadComplete, enableStorage],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        const err = rejections[0].errors[0];
        toast.error(
          err.code === "file-too-large"
            ? "File is too large. Maximum size is 50MB."
            : "Unsupported file. Use .mp4, .mov, or .avi.",
        );
        return;
      }
      if (accepted[0]) handleFile(accepted[0]);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
    },
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
    disabled: disabled || progress !== null,
  });

  const uploading = progress !== null && progress < 100;

  return (
    <div
      {...getRootProps()}
      className={`group flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-xl text-center transition-colors ${
        isDragActive
          ? "border-secondary bg-secondary-container/20"
          : "border-outline-variant bg-surface-container-lowest hover:border-secondary"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input {...getInputProps()} />

      <div
        className={`mb-md flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
          isDragActive
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container text-on-surface-variant group-hover:bg-secondary-container group-hover:text-on-secondary-container"
        }`}
      >
        <span className="material-symbols-outlined text-[40px]">video_camera_back</span>
      </div>

      {uploading ? (
        <div className="w-full max-w-xs">
          <p className="truncate font-body-md text-on-surface">{fileName}</p>
          <div className="mt-sm h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-sm font-data-mono text-data-mono text-on-surface-variant">
            UPLOADING… {Math.round(progress ?? 0)}%
          </p>
        </div>
      ) : (
        <>
          <h3 className="mb-xs font-headline-md text-headline-md text-primary">
            {isDragActive ? "Drop it here" : "Drop your footage"}
          </h3>
          <p className="mb-xl max-w-xs font-body-md text-body-md text-on-surface-variant">
            MP4, MOV or AVI — high frame rate recommended for AI biomechanics.
          </p>
          <span className="btn-primary">
            <span className="material-symbols-outlined">upload</span>
            Upload Video
          </span>
        </>
      )}
    </div>
  );
}
