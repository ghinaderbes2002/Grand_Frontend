import "server-only";

import { apiFetch } from "./client";
import type { LowStockRow, SalesReport, StagnantProduct } from "./types";

/** All of these need `reports.view` and are never cached — they are live figures. */
const fresh = { cache: "no-store", auth: true } as const;

/** Both bounds are optional; omitting them reports over all time. */
export function getSalesReport(range: { from?: string; to?: string } = {}) {
  return apiFetch<SalesReport>("/reports/sales", { ...fresh, query: range });
}

/** Threshold defaults to 5 server-side. */
export function getLowStock(threshold?: number) {
  return apiFetch<LowStockRow[]>("/reports/low-stock", {
    ...fresh,
    query: { threshold },
  });
}

/** Published products with no orders in the last `days` (default 30). */
export function getStagnantProducts(days?: number) {
  return apiFetch<StagnantProduct[]>("/reports/stagnant-products", {
    ...fresh,
    query: { days },
  });
}
