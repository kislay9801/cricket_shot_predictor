import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center px-margin">
      <div className="absolute inset-0 dotted-grid pointer-events-none" />
      <div className="relative z-10 text-center">
        <span className="material-symbols-outlined text-[56px] text-outline-variant">
          sports_cricket
        </span>
        <p className="mt-md font-data-mono text-data-mono uppercase tracking-wider text-outline">
          Error 404
        </p>
        <h1 className="mt-sm font-display-lg text-3xl font-extrabold tracking-tight text-primary sm:text-display-lg">
          This page can&apos;t be found
        </h1>
        <p className="mx-auto mt-md max-w-md font-body-md text-on-surface-variant">
          The page you&apos;re looking for doesn&apos;t exist or was moved. Head
          back to analyse a shot.
        </p>
        <div className="mt-lg flex justify-center gap-sm">
          <Link href="/" className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Predict
          </Link>
          <Link href="/history" className="btn-ghost">
            View history
          </Link>
        </div>
      </div>
    </div>
  );
}
