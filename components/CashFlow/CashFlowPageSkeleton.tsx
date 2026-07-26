import { Shimmer } from "@/components/ui/Shimmer";

export function CashFlowPageSkeleton() {
	return <div role="status" aria-label="Loading cash flow page" className="min-h-screen space-y-5 bg-gray-50 p-4 dark:bg-[#171716]"><div className="flex items-center"><Shimmer className="h-7 w-28 rounded" /><Shimmer className="ml-auto h-10 w-80 rounded-xl" /></div><Shimmer className="h-64 w-full rounded-2xl" /><div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, index) => <Shimmer key={index} className="h-24 rounded-2xl" />)}</div><Shimmer className="h-[560px] w-full rounded-2xl" /></div>;
}
