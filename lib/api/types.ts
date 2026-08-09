/**
 * Types mirroring API_CONTRACT.md.
 *
 * Where the contract documents a payload literally, the type is exact. Where it
 * only names an entity ("يشمل كل المتغيرات وصفاتها") the type covers the fields
 * the contract mentions and is marked with a TODO to confirm against a real
 * response — treat those as provisional, not verified.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type Uuid = string;
export type IsoDateString = string;

/** Uniform error body: `{ statusCode, message, error }`. */
export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: Uuid | null;
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type RoleKey =
  | "super_admin"
  | "catalog_manager"
  | "inventory_manager"
  | "order_manager"
  | "sales_agent"
  | "customer";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

/** `GET /auth/me` */
export type CurrentUser = {
  id: Uuid;
  roleKey: RoleKey;
  permissions: string[];
};

export type RegisterInput = {
  email: string;
  /** 10-128 chars; the API rejects very common passwords. */
  password: string;
  firstName?: string;
  lastName?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

/**
 * `PENDING_VERIFICATION` is internal to the backend — an account can be in it,
 * but `PATCH /users/:id/status` refuses to set it.
 */
export type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED";

/**
 * An account as `/users` returns it. The contract is explicit that no response
 * in that group ever carries `passwordHash`.
 *
 * TODO: the contract names the entity without spelling out the payload; the
 * timestamp and name fields are inferred from every other module's shape.
 */
export type User = {
  id: Uuid;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleKey: RoleKey;
  status: UserStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type CreateUserInput = {
  email: string;
  /** 10-128 chars; the API rejects very common passwords. */
  password: string;
  firstName?: string;
  lastName?: string;
  roleKey: RoleKey;
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type Category = {
  id: Uuid;
  name: string;
  slug: string;
  parentId: Uuid | null;
  /** Materialised path the API sorts flat listings by. */
  path: string;
  sortOrder: number;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isActive: boolean;
};

/** `GET /categories/tree` */
export type CategoryTreeNode = Pick<
  Category,
  "id" | "name" | "slug" | "sortOrder" | "isActive"
> & {
  children: CategoryTreeNode[];
};

/** `GET /categories/:id` — single category plus its linked attributes. */
export type CategoryDetail = Category & {
  categoryAttributes: CategoryAttribute[];
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  parentId?: Uuid | null;
  sortOrder?: number;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  isActive?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

export type AttributeType =
  | "TEXT"
  | "SELECT"
  | "COLOR_SELECT"
  | "DECIMAL_UNIT"
  | "INTEGER_UNIT"
  | "BOOLEAN";

export type AttributeOption = {
  id: Uuid;
  /** Send this exact value (case-sensitive) when setting attribute values. */
  value: string;
  label: string;
  sortOrder: number;
};

export type Attribute = {
  id: Uuid;
  /** Unique snake_case key, `a-z0-9_`. Immutable after creation. */
  key: string;
  name: string;
  /** Immutable after creation. */
  type: AttributeType;
  unit: string | null;
  isFilterable: boolean;
  /**
   * Only meaningful for `SELECT`/`COLOR_SELECT`. Optional because the API omits
   * the key entirely on attributes that have none — treat a missing list as
   * empty rather than trusting it to be there.
   */
  options?: AttributeOption[];
};

export type CreateAttributeInput = {
  key: string;
  name: string;
  type: AttributeType;
  unit?: string | null;
  isFilterable?: boolean;
};

/** `key` and `type` cannot change after creation. */
export type UpdateAttributeInput = Partial<
  Pick<Attribute, "name" | "unit" | "isFilterable">
>;

export type CreateAttributeOptionInput = {
  value: string;
  label: string;
  sortOrder?: number;
};

// ---------------------------------------------------------------------------
// Category ↔ Attribute links
// ---------------------------------------------------------------------------

export type CategoryAttribute = {
  categoryId: Uuid;
  attributeId: Uuid;
  isRequired: boolean;
  isFilterable: boolean;
  /** true = this attribute spawns product variants; false = informational. */
  createsVariant: boolean;
  sortOrder: number;
  // TODO: confirm whether the API embeds the full attribute here.
  attribute?: Attribute;
};

export type CreateCategoryAttributeInput = {
  categoryId: Uuid;
  attributeId: Uuid;
  isRequired?: boolean;
  isFilterable?: boolean;
  createsVariant?: boolean;
  sortOrder?: number;
};

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export type Brand = {
  id: Uuid;
  name: string;
  slug: string;
  isActive: boolean;
};

export type CreateBrandInput = {
  name: string;
  slug?: string;
  isActive?: boolean;
};

export type UpdateBrandInput = Partial<CreateBrandInput>;

// ---------------------------------------------------------------------------
// Products & variants
// ---------------------------------------------------------------------------

export type ProductType = "SIMPLE" | "VARIABLE";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SellingUnit =
  | "PIECE"
  | "METER"
  | "ROLL"
  | "KILOGRAM"
  | "PACKAGE"
  | "PARCEL"
  | "SHEET";

/** Units that only accept whole-number quantities. */
export const INTEGER_ONLY_UNITS: readonly SellingUnit[] = [
  "PIECE",
  "PACKAGE",
  "PARCEL",
  "SHEET",
];

export type VariantStatus = "ACTIVE" | "DISABLED";

export type AttributeValueInput = {
  attributeId: Uuid;
  value: string;
};

export type ProductAttributeValue = {
  attributeId: Uuid;
  value: string;
  // TODO: confirm whether the API embeds the attribute definition here.
  attribute?: Attribute;
};

export type ProductVariant = {
  id: Uuid;
  productId: Uuid;
  sku: string;
  barcode: string | null;
  weight: number | null;
  status: VariantStatus;
  attributeValues: ProductAttributeValue[];
  prices?: Price[];
  /**
   * Availability as a boolean only. Actual quantities are never exposed on the
   * storefront — they live behind `inventory.read` on `/inventory` and
   * `/reports/low-stock`.
   */
  inStock?: boolean;
};

/** Min/max retail price across a product's variants; null when unpriced. */
export type DisplayPrice = {
  min: number;
  max: number;
};

export type Product = {
  id: Uuid;
  categoryId: Uuid;
  brandId: Uuid | null;
  name: string;
  slug: string;
  description: string | null;
  type: ProductType;
  status: ProductStatus;
  sellingUnit: SellingUnit;
  minOrderQuantity: number;
  displayPrice: DisplayPrice | null;
  /** True when any variant has stock available in any warehouse. */
  inStock: boolean;
  attributeValues: ProductAttributeValue[];
  variants?: ProductVariant[];
  brand?: Brand | null;
  category?: Category;
};

/** Query params for `GET /products`. */
export type ProductListQuery = {
  q?: string;
  categoryId?: Uuid;
  brandId?: Uuid;
  minPrice?: number;
  maxPrice?: number;
  cursor?: Uuid;
  /** 1-100, defaults to 20. */
  limit?: number;
  /** Attribute filters, serialised as `attr_<key>=<value>`. */
  attributes?: Record<string, string>;
};

export type CreateProductInput = {
  categoryId: Uuid;
  brandId?: Uuid;
  name: string;
  slug?: string;
  description?: string;
  type: ProductType;
  sellingUnit: SellingUnit;
  minOrderQuantity: number;
  /** Informational (non variant-creating) attributes only. */
  attributeValues?: AttributeValueInput[];
  /** Required when `type` is `SIMPLE`. */
  sku?: string;
  /** `SIMPLE` only. */
  barcode?: string;
  weight?: number;
};

/** `categoryId` and `type` cannot change after creation. */
export type UpdateProductInput = Partial<
  Pick<
    CreateProductInput,
    | "name"
    | "slug"
    | "description"
    | "brandId"
    | "sellingUnit"
    | "minOrderQuantity"
    | "attributeValues"
  >
> & { status?: ProductStatus };

export type CreateVariantInput = {
  sku: string;
  barcode?: string;
  weight?: number;
  /** Must cover exactly the category's variant-creating attributes. */
  attributeValues: AttributeValueInput[];
};

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/** Seeded price lists; the API allows more. */
export type PriceListKey = "retail" | "wholesale" | (string & {});

/**
 * The system is single-currency: every amount is USD with two decimals
 * (`Decimal(12,2)`). The field is returned on every price but never varies yet.
 */
export const CURRENCY = "USD";

export type Price = {
  variantId: Uuid;
  priceListKey: PriceListKey;
  amount: number;
  currency?: string;
};

export type SetPriceInput = {
  priceListKey: PriceListKey;
  amount: number;
};

export type BulkPriceUpdateInput = {
  updates: Array<{
    variantId: Uuid;
    priceListKey: PriceListKey;
    amount: number;
  }>;
};

export type BulkPriceUpdateResult = {
  updated: number;
};

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export type MediaEntityType = "product" | "product_variant" | "category" | "brand";

export type MediaMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

/** 5 MB, enforced server-side on presign. */
export const MEDIA_MAX_SIZE_BYTES = 5_242_880;

export type Media = {
  id: Uuid;
  entityType: MediaEntityType;
  entityId: Uuid;
  key: string;
  url: string;
  sortOrder: number;
};

export type PresignInput = {
  entityType: MediaEntityType;
  entityId: Uuid;
  filename: string;
  mimeType: MediaMimeType;
  size: number;
};

export type PresignResult = {
  /** PUT the raw file here; no extra headers needed. */
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
};

export type ConfirmMediaInput = {
  key: string;
  entityType: MediaEntityType;
  entityId: Uuid;
  sortOrder?: number;
};

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

export type ImportBatchStatus = "PREVIEWED" | "COMMITTED";

export type ImportRowStatus = "VALID" | "ERROR" | "COMMITTED" | "SKIPPED";

export type ImportRow = {
  id: Uuid;
  rowNumber: number;
  status: ImportRowStatus;
  errors: string[];
  /** Raw CSV cells for this row. */
  data: Record<string, string>;
  resolvedProductId: Uuid | null;
  resolvedVariantId: Uuid | null;
};

export type ImportBatch = {
  id: Uuid;
  status: ImportBatchStatus;
  filename: string;
  createdAt: IsoDateString;
  rows: ImportRow[];
};

/** Fixed CSV column map (v1 — no custom mapping UI yet). */
export const IMPORT_COLUMNS = {
  required: ["sku", "productName", "categorySlug", "price"],
  optional: ["brandSlug", "sellingUnit", "weight"],
  /** Plus any `attr_<key>` column. */
  attributePrefix: "attr_",
} as const;

// ---------------------------------------------------------------------------
// Warehouses & inventory
// ---------------------------------------------------------------------------

export type Warehouse = {
  id: Uuid;
  code: string;
  name: string;
  isActive: boolean;
};

export type InventoryLevel = {
  variantId: Uuid;
  warehouseId: Uuid;
  quantityOnHand: number;
  quantityReserved: number;
};

/** Actually sellable quantity. */
export function availableQuantity(level: InventoryLevel) {
  return level.quantityOnHand - level.quantityReserved;
}

export type InventoryMovementType =
  | "RECEIPT"
  | "ADJUSTMENT"
  | "RESERVE"
  | "RELEASE"
  | "DEDUCT"
  | "RETURN";

export type InventoryMovement = {
  id: Uuid;
  variantId: Uuid;
  warehouseId: Uuid;
  type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  createdAt: IsoDateString;
};

export type ReceiveInventoryInput = {
  variantId: Uuid;
  quantity: number;
  reason?: string;
  warehouseId?: Uuid;
};

export type AdjustInventoryInput = {
  variantId: Uuid;
  /** May be negative. */
  quantityDelta: number;
  /** Mandatory here — a manual correction needs a justification. */
  reason: string;
  warehouseId?: Uuid;
};

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT";

export type Coupon = {
  id: Uuid;
  /** Uppercase letters, digits, `_` and `-`; unique. */
  code: string;
  type: CouponType;
  /** A percentage for `PERCENTAGE`, an amount for `FIXED_AMOUNT`. */
  value: number;
  maxUses?: number | null;
  usedCount?: number;
  minOrderTotal?: number | null;
  startsAt?: IsoDateString | null;
  expiresAt?: IsoDateString | null;
  isActive: boolean;
};

/**
 * `POST /coupons/validate` — checks a code without consuming it, for showing
 * the expected discount before checkout. Deliberately **not public**: making it
 * so would let anyone brute-force discover codes.
 *
 * The response shape is not pinned down by the contract, so the discount is
 * recomputed locally when the API does not return one.
 */
export type CouponValidation = {
  valid?: boolean;
  discountAmount?: number;
  coupon?: Coupon;
};

export type CouponInput = {
  code: string;
  type: CouponType;
  value: number;
  maxUses?: number;
  minOrderTotal?: number;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
};

/** Mirrors what the API applies, for previewing a discount client-side. */
export function couponDiscount(coupon: Coupon, subtotal: number) {
  const raw =
    coupon.type === "PERCENTAGE" ? (subtotal * coupon.value) / 100 : coupon.value;

  // Never more than the order is worth.
  return Math.min(Math.max(raw, 0), subtotal);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/**
 * `GET /reports/sales`. Counts only orders that actually reached `PAID` or
 * beyond — pending, cancelled and failed orders are excluded.
 */
export type SalesReport = {
  totalRevenue: number;
  orderCount: number;
  byDay: Array<{
    date: IsoDateString;
    revenue: number;
    orderCount: number;
  }>;
};

/**
 * `GET /reports/low-stock` — one row per variant × warehouse where
 * `onHand - reserved` is at or below the threshold, least available first.
 * This is the endpoint for a stock-alerts screen; `/inventory` takes a single
 * variant and cannot answer it.
 */
export type LowStockRow = InventoryLevel & {
  // TODO: confirm how much context the row carries; the UI falls back to ids.
  sku?: string;
  productId?: Uuid;
  productName?: string;
  warehouseCode?: string;
  available?: number;
};

/** `GET /reports/stagnant-products` — published products with no recent orders. */
export type StagnantProduct = Pick<Product, "id" | "name" | "slug"> & {
  lastOrderedAt?: IsoDateString | null;
};

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export type CartItem = {
  id: Uuid;
  variantId: Uuid;
  quantity: number;
  /**
   * The contract shows this as `{ "...": "..." }` without saying what it holds.
   * A customer cannot resolve it themselves — `GET /products/:id` needs
   * `products.read` — so the cart can only name a line if these are embedded.
   * TODO: confirm; the UI falls back to the SKU when they are absent.
   */
  variant: ProductVariant & {
    product?: Pick<Product, "id" | "name" | "slug">;
    prices?: Price[];
  };
};

export type Cart = {
  id: Uuid;
  items: CartItem[];
  /** null when any item has no retail price set. */
  total: number | null;
};

export type AddCartItemInput = {
  variantId: Uuid;
  quantity: number;
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED";

/** Statuses a customer may cancel from. */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
];

export type ShippingAddress = {
  city: string;
  street: string;
  [key: string]: string;
};

export type OrderItem = {
  id: Uuid;
  variantId: Uuid;
  sku: string;
  quantity: number;
  /**
   * The price is frozen when the order is placed, from whichever price list
   * applies to that customer, and does not follow later price changes. The
   * contract names it `unitPriceSnapshot`; `unitPrice` is accepted as a
   * fallback until a real response confirms which one ships.
   */
  unitPriceSnapshot?: number;
  unitPrice?: number;
};

export type OrderStatusHistoryEntry = {
  id: Uuid;
  status: OrderStatus;
  reason: string | null;
  createdAt: IsoDateString;
};

/**
 * `GET /orders/:id` embeds everything about an order — items, payments,
 * shipments and the status history — so no separate call is needed to refund a
 * payment or read a tracking number.
 */
export type Order = {
  id: Uuid;
  status: OrderStatus;
  total: number;
  /** Present when a coupon was applied at creation. */
  discountAmount?: number;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  createdAt: IsoDateString;
  payments?: Payment[];
  shipments?: Shipment[];
  statusHistory?: OrderStatusHistoryEntry[];
};

/** Query params for the admin `GET /orders` listing. */
export type OrderListQuery = {
  status?: OrderStatus;
  cursor?: Uuid;
  /** 1-100, defaults to 20. */
  limit?: number;
};

export type CreateOrderInput = {
  shippingAddress: ShippingAddress;
  /** Validated and consumed atomically while the order is created. */
  couponCode?: string;
};

export type UpdateOrderStatusInput = {
  status: OrderStatus;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentStatus = "SUCCEEDED" | "FAILED" | "REFUNDED";

export type Payment = {
  id: Uuid;
  orderId: Uuid;
  status: PaymentStatus;
  amount: number;
  currency?: string;
  provider: string;
  createdAt: IsoDateString;
};

export type PayOrderInput = {
  simulateFailure?: boolean;
};

export type RefundInput = {
  amount: number;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

export type ShipmentStatus = "PENDING" | "DELIVERED";

export type Shipment = {
  id: Uuid;
  orderId: Uuid;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  createdAt: IsoDateString;
};

export type CreateShipmentInput = {
  carrier: string;
  trackingNumber: string;
};
