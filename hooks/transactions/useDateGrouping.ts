"use client";

/**
 * Hook for grouping transactions by date and computing a flat list with
 * date headers and transaction rows, plus an index mapping rows to their
 * nearest header for sticky header logic.
 */

import { useMemo } from "react";
import type { Row } from "@tanstack/react-table";
import type { Transaction } from "@/store/useBudgetStore";

export const DATE_HEADER_HEIGHT = 48;
export const TRANSACTION_ROW_HEIGHT = 56;

export function getDateInfo(dateValue: string): {
  key: string;
  label: string;
  timestamp: number;
} {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      key: "unknown-date",
      label: "Unknown date",
      timestamp: Number.NEGATIVE_INFINITY,
    };
  }

  const year = parsedDate.getUTCFullYear();
  const month = parsedDate.getUTCMonth();
  const day = parsedDate.getUTCDate();
  const timestamp = Date.UTC(year, month, day);
  const monthValue = String(month + 1).padStart(2, "0");
  const dayValue = String(day).padStart(2, "0");

  return {
    key: `${year}-${monthValue}-${dayValue}`,
    label: dateFormatter.format(new Date(timestamp)),
    timestamp,
  };
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export type DateHeaderItem = {
  type: "header";
  id: string;
  date: string;
  total: number;
};

export type TransactionRowItem = {
  type: "row";
  id: string;
  row: Row<Transaction>;
};

export type FlatItem = DateHeaderItem | TransactionRowItem;

export function useDateGrouping(
  rows: Row<Transaction>[],
  disableDateGrouping: boolean
): {
  flatRows: FlatItem[];
  stickyHeaderIndexByItemIndex: number[];
} {
  const flatRows = useMemo<FlatItem[]>(() => {
    if (disableDateGrouping) {
      return rows.map((row) => ({
        type: "row" as const,
        id: `row-${row.id}`,
        row,
      }));
    }
    const dateTotals = new Map<string, number>();
    const rowDateInfo = new Map<
      string,
      {
        key: string;
        label: string;
      }
    >();

    for (const row of rows) {
      const dateInfo = getDateInfo(row.original.date);
      const amount = Number(row.original.amount);

      rowDateInfo.set(row.id, {
        key: dateInfo.key,
        label: dateInfo.label,
      });

      dateTotals.set(
        dateInfo.key,
        (dateTotals.get(dateInfo.key) ?? 0) +
          (Number.isFinite(amount) ? amount : 0)
      );
    }

    const result: FlatItem[] = [];
    let previousDateKey: string | null = null;
    let headerSequence = 0;

    for (const row of rows) {
      const dateInfo = rowDateInfo.get(row.id);

      if (!dateInfo) {
        continue;
      }

      if (dateInfo.key !== previousDateKey) {
        result.push({
          type: "header",
          id: `header-${dateInfo.key}-${headerSequence}`,
          date: dateInfo.label,
          total: dateTotals.get(dateInfo.key) ?? 0,
        });

        previousDateKey = dateInfo.key;
        headerSequence++;
      }

      result.push({
        type: "row",
        id: `row-${row.id}`,
        row,
      });
    }

    return result;
  }, [disableDateGrouping, rows]);

  const stickyHeaderIndexByItemIndex = useMemo(() => {
    const indices = new Array<number>(flatRows.length);
    let latestHeaderIndex = -1;

    for (let index = 0; index < flatRows.length; index++) {
      if (flatRows[index].type === "header") {
        latestHeaderIndex = index;
      }
      indices[index] = latestHeaderIndex;
    }

    return indices;
  }, [flatRows]);

  return { flatRows, stickyHeaderIndexByItemIndex };
}