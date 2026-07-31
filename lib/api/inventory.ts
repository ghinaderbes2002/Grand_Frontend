import "server-only";

import { apiFetch } from "./client";
import type { InventoryLevel, InventoryMovement, Uuid, Warehouse } from "./types";

const fresh = { cache: "no-store", auth: true } as const;

/**
 * Stock levels for one variant, one row per warehouse. Note the API is
 * per-variant only — there is no bulk endpoint, so a screen showing several
 * variants issues one call each (in parallel).
 */
export function getInventoryLevels(variantId: Uuid) {
  return apiFetch<InventoryLevel[]>("/inventory", { ...fresh, query: { variantId } });
}

/** Audit trail: RECEIPT / ADJUSTMENT / RESERVE / RELEASE / DEDUCT / RETURN. */
export function getInventoryMovements(variantId: Uuid) {
  return apiFetch<InventoryMovement[]>("/inventory/movements", {
    ...fresh,
    query: { variantId },
  });
}

export function listWarehouses() {
  return apiFetch<Warehouse[]>("/warehouses", fresh);
}

export function getWarehouse(id: Uuid) {
  return apiFetch<Warehouse>(`/warehouses/${id}`, fresh);
}
