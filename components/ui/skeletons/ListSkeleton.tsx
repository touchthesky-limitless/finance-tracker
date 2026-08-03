import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 3, hasAvatar = false }: { rows?: number; hasAvatar?: boolean }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-white/10">
          {hasAvatar && <Skeleton className="size-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}