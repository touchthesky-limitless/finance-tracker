export function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse space-y-8">
      
      {/* 1. Header & Filter Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        <div className="h-10 w-full md:w-56 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
      </div>

      {/* 2. Chart Section Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Pie Chart Placeholder */}
        <div className="relative h-64 md:h-80 w-full flex items-center justify-center">
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-8 border-gray-100 dark:border-gray-800"></div>
          {/* Center Text */}
          <div className="absolute flex flex-col items-center gap-2">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
          </div>
        </div>

        {/* Legend List Placeholder */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recent Transactions Skeleton */}
      <div className="space-y-6">
        {[1, 2].map((group) => (
          <div key={group} className="space-y-4">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded ml-1"></div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {[1, 2, 3].map((t) => (
                <div key={t} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-3 w-20 bg-gray-100 dark:bg-gray-900 rounded"></div>
                    </div>
                  </div>
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}