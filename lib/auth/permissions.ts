import type { CurrentUser } from "@/lib/api/types";

/**
 * Permission strings used by the API, as documented in API_CONTRACT.md.
 *
 * These drive what the UI shows. They are **not** a security boundary — the
 * backend re-checks every call, and it is the only opinion that counts.
 */
export const PERMISSIONS = {
  categoriesCreate: "categories.create",
  categoriesUpdate: "categories.update",
  categoriesDelete: "categories.delete",
  attributesCreate: "attributes.create",
  attributesUpdate: "attributes.update",
  attributesDelete: "attributes.delete",
  productsRead: "products.read",
  productsCreate: "products.create",
  productsUpdate: "products.update",
  productsDelete: "products.delete",
  pricesUpdate: "prices.update",
  mediaManage: "media.manage",
  importsManage: "imports.manage",
  warehousesManage: "warehouses.manage",
  inventoryRead: "inventory.read",
  inventoryAdjust: "inventory.adjust",
  ordersRead: "orders.read",
  ordersUpdateStatus: "orders.updateStatus",
  ordersRefund: "orders.refund",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * The contract documents `permissions: []` for a customer but never spells out
 * what a `super_admin` gets back. Treating that role as all-powerful here keeps
 * the admin UI usable either way: if the backend does list every permission the
 * branch is redundant, and if it does not we still show the right screens.
 */
export function can(session: CurrentUser | null, permission: Permission): boolean {
  if (!session) return false;
  if (session.roleKey === "super_admin") return true;
  return session.permissions.includes(permission);
}

export function canAny(session: CurrentUser | null, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(session, permission));
}
