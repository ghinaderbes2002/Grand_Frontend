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
  options: AttributeOption[];
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

export type Price = {
  variantId: Uuid;
  priceListKey: PriceListKey;
  amount: number;
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
  unitPrice: number;
  // TODO: confirm the exact order-item shape against a real response.
};

export type Order = {
  id: Uuid;
  status: OrderStatus;
  total: number;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  createdAt: IsoDateString;
  /**
   * There is **no endpoint to list an order's payments** — the contract only
   * returns a payment record from `POST /orders/:id/pay`, while
   * `POST /payments/:paymentId/refund` needs an id. So refunding is only
   * reachable if the order response embeds them. Optional until confirmed.
   */
  payments?: Payment[];
  // TODO: confirm whether the order response embeds shipments; there is a
  // dedicated `GET /orders/:orderId/shipments` either way.
  shipments?: Shipment[];
};

export type CreateOrderInput = {
  shippingAddress: ShippingAddress;
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
