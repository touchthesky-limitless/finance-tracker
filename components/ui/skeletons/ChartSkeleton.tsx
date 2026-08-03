import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-[390px] w-full rounded-2xl ${className}`} />;
}