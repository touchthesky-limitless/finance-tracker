// 1. Export the main page component (default export)
export { default as CategoryGroupDetailsPage } from './CategoryGroupDetailsPageClient';

// 2. Export reusable sub-components from this feature
export { GroupTrendChart } from './GroupTrendChart';
export { GroupTransactionSummary } from './GroupTransactionSummary';
export { CategoryGroupSelect } from './CategoryGroupSelect';

export * from './utils';   // re‑export feature utils
export * from './types';   // re‑export GroupChartPeriod