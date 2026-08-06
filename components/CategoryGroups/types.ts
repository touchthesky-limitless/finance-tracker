/**
 * Local type definitions for the Category Group Details page.
 * Includes the shape of chart periods used in the trend chart.
 */

export interface GroupChartPeriod {
  key: string;
  label: string;
  shortLabel: string;
  start: Date;
  end: Date;
  amount: number;
  year: number;
  showYearMarker: boolean;
}