import "server-only";

import { apiFetch } from "./client";
import type { ImportBatch, Uuid } from "./types";

const fresh = { cache: "no-store", auth: true } as const;

export function listImportBatches() {
  return apiFetch<ImportBatch[]>("/imports", fresh);
}

export function getImportBatch(id: Uuid) {
  return apiFetch<ImportBatch>(`/imports/${id}`, fresh);
}
