import { z } from "zod";

/** Messages are dictionary keys under `errors`, resolved when the form renders. */

const name = z
  .string({ error: "required" })
  .trim()
  .min(1, { error: "required" })
  .max(200, { error: "tooLong" });

const slug = z.string().trim().max(200, { error: "tooLong" }).optional();

const sortOrder = z
  .number({ error: "notANumber" })
  .int({ error: "notANumber" })
  .optional();

const uuid = z.uuid({ error: "required" });

export const categorySchema = z.object({
  name,
  slug,
  parentId: uuid.nullable(),
  sortOrder,
  imageUrl: z.string().trim().max(2000, { error: "tooLong" }).optional(),
  seoTitle: z.string().trim().max(200, { error: "tooLong" }).optional(),
  seoDescription: z.string().trim().max(500, { error: "tooLong" }).optional(),
  isActive: z.boolean(),
});

export const attributeSchema = z.object({
  // Contract: unique snake_case, `a-z0-9_`, immutable after creation.
  key: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .regex(/^[a-z0-9_]+$/, { error: "invalidKeyFormat" }),
  name,
  type: z.enum(
    ["TEXT", "SELECT", "COLOR_SELECT", "DECIMAL_UNIT", "INTEGER_UNIT", "BOOLEAN"],
    { error: "required" },
  ),
  unit: z.string().trim().max(50, { error: "tooLong" }).optional(),
  isFilterable: z.boolean(),
});

/** `key` and `type` cannot change after creation. */
export const attributeUpdateSchema = attributeSchema.pick({
  name: true,
  unit: true,
  isFilterable: true,
});

export const attributeOptionSchema = z.object({
  value: z.string({ error: "required" }).trim().min(1, { error: "required" }),
  label: z.string({ error: "required" }).trim().min(1, { error: "required" }),
  sortOrder,
});

export const brandSchema = z.object({
  name,
  slug,
  isActive: z.boolean(),
});

const SELLING_UNITS = [
  "PIECE",
  "METER",
  "ROLL",
  "KILOGRAM",
  "PACKAGE",
  "PARCEL",
  "SHEET",
] as const;

/** Units the API refuses to accept fractional quantities for. */
const INTEGER_UNITS = new Set(["PIECE", "PACKAGE", "PARCEL", "SHEET"]);

const attributeValues = z
  .array(z.object({ attributeId: uuid, value: z.string().min(1, { error: "required" }) }))
  .optional();

export const productSchema = z
  .object({
    categoryId: uuid,
    brandId: uuid.optional(),
    name,
    slug,
    description: z.string().trim().max(5000, { error: "tooLong" }).optional(),
    type: z.enum(["SIMPLE", "VARIABLE"], { error: "required" }),
    sellingUnit: z.enum(SELLING_UNITS, { error: "required" }),
    minOrderQuantity: z
      .number({ error: "notANumber" })
      .positive({ error: "notPositive" }),
    attributeValues,
    sku: z.string().trim().min(1, { error: "required" }).optional(),
    barcode: z.string().trim().optional(),
    weight: z.number({ error: "notANumber" }).nonnegative({ error: "notPositive" }).optional(),
  })
  .refine((data) => data.type !== "SIMPLE" || Boolean(data.sku), {
    // The API requires a SKU up front for simple products, since they get one
    // implicit variant and that variant needs an identifier.
    error: "required",
    path: ["sku"],
  })
  .refine(
    (data) =>
      !INTEGER_UNITS.has(data.sellingUnit) || Number.isInteger(data.minOrderQuantity),
    { error: "mustBeInteger", path: ["minOrderQuantity"] },
  );

/** `categoryId` and `type` cannot change after creation. */
export const productUpdateSchema = z.object({
  name,
  slug,
  description: z.string().trim().max(5000, { error: "tooLong" }).optional(),
  brandId: uuid.optional(),
  sellingUnit: z.enum(SELLING_UNITS, { error: "required" }),
  minOrderQuantity: z.number({ error: "notANumber" }).positive({ error: "notPositive" }),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"], { error: "required" }),
  attributeValues,
});

export const variantSchema = z.object({
  sku: z.string({ error: "required" }).trim().min(1, { error: "required" }),
  barcode: z.string().trim().optional(),
  weight: z.number({ error: "notANumber" }).nonnegative({ error: "notPositive" }).optional(),
  /** Must cover exactly the category's variant-creating attributes. */
  attributeValues: z.array(
    z.object({ attributeId: uuid, value: z.string().min(1, { error: "required" }) }),
  ),
});

export const priceSchema = z.object({
  priceListKey: z.string({ error: "required" }).trim().min(1, { error: "required" }),
  amount: z.number({ error: "notANumber" }).nonnegative({ error: "notPositive" }),
});

export const warehouseSchema = z.object({
  code: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(50, { error: "tooLong" }),
  name,
  isActive: z.boolean(),
});

/** `code` is immutable once created; only these two may change. */
export const warehouseUpdateSchema = warehouseSchema.pick({
  name: true,
  isActive: true,
});

export const customerPriceListSchema = z.object({
  customerId: uuid,
  /** Blank clears the override and returns the customer to retail. */
  priceListKey: z.string().trim().optional(),
});

const reason = z.string().trim().max(500, { error: "tooLong" });

export const receiveInventorySchema = z.object({
  variantId: uuid,
  quantity: z.number({ error: "notANumber" }).positive({ error: "notPositive" }),
  /** Optional here, unlike an adjustment — a receipt is self-explanatory. */
  reason: reason.optional(),
  warehouseId: uuid.optional(),
});

export const adjustInventorySchema = z.object({
  variantId: uuid,
  quantityDelta: z
    .number({ error: "notANumber" })
    .refine((value) => value !== 0, { error: "notZero" }),
  /** Mandatory: a manual correction needs a justification for the audit trail. */
  reason: reason.min(1, { error: "required" }),
  warehouseId: uuid.optional(),
});

export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
] as const;

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: "required" }),
  reason: z.string().trim().max(500, { error: "tooLong" }).optional(),
});

export const shippingAddressSchema = z.object({
  city: z.string({ error: "required" }).trim().min(1, { error: "required" }).max(120),
  street: z.string({ error: "required" }).trim().min(1, { error: "required" }).max(300),
});

export const refundSchema = z.object({
  amount: z.number({ error: "notANumber" }).positive({ error: "notPositive" }),
  reason: z.string().trim().max(500, { error: "tooLong" }).optional(),
});

export const shipmentSchema = z.object({
  carrier: z.string({ error: "required" }).trim().min(1, { error: "required" }).max(120),
  trackingNumber: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(120),
});

export const cartItemSchema = z.object({
  variantId: uuid,
  quantity: z.number({ error: "notANumber" }).positive({ error: "notPositive" }),
});

export const cartQuantitySchema = z.object({
  /** Zero is meaningful here: the API treats it as "remove this item". */
  quantity: z.number({ error: "notANumber" }).nonnegative({ error: "notPositive" }),
});

export const couponSchema = z.object({
  code: z
    .string({ error: "required" })
    .trim()
    .min(1, { error: "required" })
    .max(60, { error: "tooLong" })
    // The API is strict about the alphabet; uppercase here so a lowercase
    // entry is accepted rather than rejected on a technicality.
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_-]+$/, { error: "invalidCouponCode" })),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], { error: "required" }),
  value: z.number({ error: "notANumber" }).positive({ error: "notPositive" }),
  maxUses: z.number({ error: "notANumber" }).int().positive({ error: "notPositive" }).optional(),
  minOrderTotal: z.number({ error: "notANumber" }).nonnegative({ error: "notPositive" }).optional(),
  startsAt: z.string().trim().optional(),
  expiresAt: z.string().trim().optional(),
  isActive: z.boolean(),
});

export const categoryAttributeSchema = z.object({
  categoryId: uuid,
  attributeId: uuid,
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  createsVariant: z.boolean(),
  sortOrder,
});
