"use client";

import { isFirebaseConfigured } from "@/lib/firebase";

/** Friendly banner shown until Firebase env vars are filled in. The app still
 *  renders (shots fall back to the local catalog) so the UI can be explored. */
export function ConfigBanner() {
  if (isFirebaseConfigured) return null;
  return (
    <div className="border-b border-outline-variant bg-error-container px-margin py-sm text-center font-data-mono text-data-mono text-on-error-container">
      Demo mode — Firebase isn&apos;t configured. Add keys to .env.local to enable uploads &amp; history.
    </div>
  );
}
