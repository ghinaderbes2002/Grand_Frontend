import "server-only";

import { apiFetch } from "./client";
import type { Coupon, Uuid } from "./types";

/** Never cached — usage counts and validity windows move. */
const fresh = { cache: "no-store", auth: true } as const;

export function listCoupons() {
  return apiFetch<Coupon[]>("/coupons", fresh);
}

export function getCoupon(id: Uuid) {
  return apiFetch<Coupon>(`/coupons/${id}`, fresh);
}
