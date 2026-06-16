interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function ShotCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-sm p-md">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="card grid grid-cols-1 gap-lg p-lg md:grid-cols-2">
      <div className="flex flex-col items-center gap-md border-b border-outline-variant pb-lg md:border-b-0 md:border-r md:pb-0 md:pr-lg">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="space-y-md">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}
