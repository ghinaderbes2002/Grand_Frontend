// Throwaway backend covering the auth + catalog endpoints the admin panel uses.
// Mirrors the contract's status codes, not its persistence.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = 3100;

const USER = {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
  id: "11111111-2222-3333-4444-555555555555",
  roleKey: "super_admin",
  permissions: [],
};

/** Exactly the list the contract gives for `roleKey`. */
const ROLE_KEYS = [
  "super_admin",
  "catalog_manager",
  "inventory_manager",
  "order_manager",
  "sales_agent",
  "customer",
];

/** The signed-in account, as `/users` would report it. */
const seedUsers = () => [
  {
    id: USER.id,
    email: USER.email,
    firstName: "مدير",
    lastName: "عام",
    roleKey: "super_admin",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const db = {
  users: seedUsers(),
  categories: [],
  attributes: [],
  categoryAttributes: [],
  brands: [],
  products: [],
  variants: [],
  prices: [],
  media: [],
  orders: [],
  shipments: [],
  coupons: [],
  customerPriceLists: {},
  cart: { id: "cart-1", items: [], total: 0 },
  warehouses: [
    { id: randomUUID(), code: "MAIN", name: "المستودع الرئيسي", isActive: true },
  ],
  levels: [],
  movements: [],
};

const defaultWarehouse = () => db.warehouses.find((w) => w.isActive) ?? db.warehouses[0];

function levelFor(variantId, warehouseId) {
  let level = db.levels.find(
    (l) => l.variantId === variantId && l.warehouseId === warehouseId,
  );
  if (!level) {
    level = { variantId, warehouseId, quantityOnHand: 0, quantityReserved: 0 };
    db.levels.push(level);
  }
  return level;
}

/** Returns the discount, or a reason string when the code cannot be used. */
function evaluateCoupon(coupon, subtotal) {
  const now = Date.now();
  if (!coupon.isActive) return "inactive";
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return "early";
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return "expired";
  if (coupon.minOrderTotal && subtotal < coupon.minOrderTotal) return "below-minimum";
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return "exhausted";

  const raw =
    coupon.type === "PERCENTAGE" ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.min(Math.max(raw, 0), subtotal);
}

const refreshTokens = new Map();
const log = [];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

function issue() {
  const exp = Math.floor(Date.now() / 1000) + 900;
  const accessToken = `${b64({ alg: "HS256" })}.${b64({ sub: USER.id, exp })}.sig`;
  const refreshToken = randomUUID();
  refreshTokens.set(refreshToken, true);
  return { accessToken, refreshToken };
}

const slugify = (s) =>
  s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "");

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
const err = (res, status, message, error) =>
  send(res, status, { statusCode: status, message, error });

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function authed(req) {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  try {
    const { exp } = JSON.parse(
      Buffer.from(auth.slice(7).split(".")[1], "base64url").toString(),
    );
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Permissions exactly as API_CONTRACT.md states them, so the suites exercise
 * what the real API would allow rather than only what the UI chooses to show.
 *
 * `super_admin` is treated as holding everything — the contract never says what
 * that role's `permissions` array contains, which is itself an open question.
 */
function allowed(permission) {
  if (USER.roleKey === "super_admin") return true;
  return USER.permissions.includes(permission);
}

/**
 * Rebuilds `path` for a category and everything under it.
 *
 * Built from **ids**, matching what the live backend returns. It used to use
 * slugs here, which read like a breadcrumb and hid a bug: the UI rendered
 * `path` as a label and showed customers raw UUIDs in production while every
 * test passed.
 */
function rebuildPaths() {
  const byId = new Map(db.categories.map((c) => [c.id, c]));
  const pathOf = (c) => {
    const chain = [];
    let node = c;
    const seen = new Set();
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      chain.unshift(node.id);
      node = node.parentId ? byId.get(node.parentId) : null;
    }
    return `/${chain.join("/")}/`;
  };
  for (const c of db.categories) c.path = pathOf(c);
}

function isDescendant(candidateId, ofId) {
  const byId = new Map(db.categories.map((c) => [c.id, c]));
  let node = byId.get(candidateId);
  const seen = new Set();
  while (node?.parentId && !seen.has(node.id)) {
    seen.add(node.id);
    if (node.parentId === ofId) return true;
    node = byId.get(node.parentId);
  }
  return false;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;
  const body = method === "POST" || method === "PATCH" ? await readBody(req) : {};
  log.push(`${method} ${path}`);

  const needsAuth = () => {
    if (authed(req)) return false;
    err(res, 401, "Unauthorized", "Unauthorized");
    return true;
  };

  /** Returns true (and has already answered 401/403) when the caller may not proceed. */
  const needs = (permission) => {
    if (needsAuth()) return true;
    if (allowed(permission)) return false;
    err(res, 403, `Missing permission: ${permission}`, "Forbidden");
    return true;
  };

  // --- auth ---------------------------------------------------------------
  if (path === "/auth/login" && method === "POST") {
    if (body.email !== USER.email || body.password !== USER.password) {
      return err(res, 401, "Invalid credentials", "Unauthorized");
    }
    return send(res, 200, issue());
  }
  if (path === "/auth/refresh" && method === "POST") {
    if (!refreshTokens.delete(body.refreshToken)) {
      return err(res, 401, "Invalid refresh token", "Unauthorized");
    }
    return send(res, 200, issue());
  }
  if (path === "/auth/me" && method === "GET") {
    if (needsAuth()) return;
    return send(res, 200, {
      id: USER.id,
      roleKey: USER.roleKey,
      permissions: USER.permissions,
    });
  }
  if (path === "/auth/logout" && method === "POST") {
    refreshTokens.delete(body.refreshToken);
    return send(res, 204);
  }

  // --- users ---------------------------------------------------------------
  if (path === "/users" && method === "GET") {
    if (needs("users.manage")) return;
    return send(res, 200, db.users);
  }
  if (path === "/users" && method === "POST") {
    if (needs("users.manage")) return;
    if (db.users.some((u) => u.email === body.email)) {
      return err(res, 409, "Email already registered", "Conflict");
    }
    if (!ROLE_KEYS.includes(body.roleKey)) {
      return err(res, 404, "Role not found", "Not Found");
    }
    const user = {
      id: randomUUID(),
      email: body.email,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      roleKey: body.roleKey,
      // Staff created here skip verification, unlike `/auth/register`.
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(user);
    return send(res, 201, user);
  }
  const userMatch = path.match(/^\/users\/([^/]+)(\/role|\/status)?$/);
  if (userMatch) {
    if (needs("users.manage")) return;
    const user = db.users.find((u) => u.id === userMatch[1]);
    if (!user) return err(res, 404, "User not found", "Not Found");

    if (!userMatch[2] && method === "GET") return send(res, 200, user);

    if (userMatch[2] === "/role" && method === "PATCH") {
      if (!ROLE_KEYS.includes(body.roleKey)) {
        return err(res, 404, "Role not found", "Not Found");
      }
      user.roleKey = body.roleKey;
      user.updatedAt = new Date().toISOString();
      return send(res, 200, user);
    }

    if (userMatch[2] === "/status" && method === "PATCH") {
      // PENDING_VERIFICATION is internal — the API refuses to be put back into it.
      if (!["ACTIVE", "SUSPENDED", "DISABLED"].includes(body.status)) {
        return err(res, 400, "Invalid status", "Bad Request");
      }
      user.status = body.status;
      user.updatedAt = new Date().toISOString();
      return send(res, 200, user);
    }
  }

  // --- categories ---------------------------------------------------------
  if (path === "/categories" && method === "GET") {
    return send(res, 200, [...db.categories].sort((a, b) => a.path.localeCompare(b.path)));
  }
  if (path === "/categories/tree" && method === "GET") {
    const build = (parentId) =>
      db.categories
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          children: build(c.id),
        }));
    return send(res, 200, build(null));
  }
  if (path === "/categories" && method === "POST") {
    if (needs("categories.create")) return;
    const slug = body.slug || slugify(body.name);
    if (body.parentId && !db.categories.some((c) => c.id === body.parentId)) {
      return err(res, 404, "Parent category not found", "Not Found");
    }
    if (db.categories.some((c) => c.slug === slug)) {
      return err(res, 409, "Slug already exists", "Conflict");
    }
    const category = {
      id: randomUUID(),
      name: body.name,
      slug,
      parentId: body.parentId ?? null,
      path: "",
      sortOrder: body.sortOrder ?? 0,
      imageUrl: body.imageUrl ?? null,
      seoTitle: body.seoTitle ?? null,
      seoDescription: body.seoDescription ?? null,
      isActive: body.isActive ?? true,
    };
    db.categories.push(category);
    rebuildPaths();
    return send(res, 201, category);
  }

  const categoryMatch = path.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const category = db.categories.find((c) => c.id === categoryMatch[1]);
    if (!category) return err(res, 404, "Category not found", "Not Found");

    if (method === "GET") {
      return send(res, 200, {
        ...category,
        categoryAttributes: db.categoryAttributes
          .filter((l) => l.categoryId === category.id)
          .map((l) => {
            // The real API embeds the attribute here but strips `options` off
            // it, so callers must go to `/attributes` for the choices. Mirrored
            // exactly, or the frontend looks fine here and breaks in prod.
            const attribute = db.attributes.find((a) => a.id === l.attributeId);
            if (!attribute) return l;
            const { options: _stripped, ...withoutOptions } = attribute;
            return { ...l, attribute: withoutOptions };
          }),
      });
    }
    if (method === "PATCH") {
      if (needs("categories.update")) return;
      if (body.parentId) {
        if (!db.categories.some((c) => c.id === body.parentId)) {
          return err(res, 404, "Parent category not found", "Not Found");
        }
        if (body.parentId === category.id || isDescendant(body.parentId, category.id)) {
          return err(res, 409, "Cannot move a category under its own child", "Conflict");
        }
      }
      if (body.slug && db.categories.some((c) => c.slug === body.slug && c.id !== category.id)) {
        return err(res, 409, "Slug already exists", "Conflict");
      }
      Object.assign(category, body);
      rebuildPaths();
      return send(res, 200, category);
    }
    if (method === "DELETE") {
      if (needs("categories.delete")) return;
      if (db.categories.some((c) => c.parentId === category.id)) {
        return err(res, 409, "Category has children", "Conflict");
      }
      db.categories = db.categories.filter((c) => c.id !== category.id);
      return send(res, 204);
    }
  }

  // --- attributes ---------------------------------------------------------
  if (path === "/attributes" && method === "GET") return send(res, 200, db.attributes);
  if (path === "/attributes" && method === "POST") {
    if (needs("attributes.create")) return;
    if (db.attributes.some((a) => a.key === body.key)) {
      return err(res, 409, "Attribute key already exists", "Conflict");
    }
    const attribute = {
      id: randomUUID(),
      key: body.key,
      name: body.name,
      type: body.type,
      unit: body.unit ?? null,
      isFilterable: body.isFilterable ?? true,
      options: [],
    };
    db.attributes.push(attribute);
    return send(res, 201, attribute);
  }

  const optionMatch = path.match(/^\/attributes\/([^/]+)\/options(?:\/([^/]+))?$/);
  if (optionMatch) {
    if (needs("attributes.update")) return;
    const attribute = db.attributes.find((a) => a.id === optionMatch[1]);
    if (!attribute) return err(res, 404, "Attribute not found", "Not Found");

    if (method === "POST") {
      if (attribute.options.some((o) => o.value === body.value)) {
        return err(res, 409, "Option value already exists", "Conflict");
      }
      const option = {
        id: randomUUID(),
        value: body.value,
        label: body.label,
        sortOrder: body.sortOrder ?? 0,
      };
      attribute.options.push(option);
      return send(res, 201, option);
    }
    if (method === "DELETE") {
      attribute.options = attribute.options.filter((o) => o.id !== optionMatch[2]);
      return send(res, 204);
    }
  }

  const attributeMatch = path.match(/^\/attributes\/([^/]+)$/);
  if (attributeMatch) {
    const attribute = db.attributes.find((a) => a.id === attributeMatch[1]);
    if (!attribute) return err(res, 404, "Attribute not found", "Not Found");

    if (method === "GET") return send(res, 200, attribute);
    if (method === "PATCH") {
      if (needs("attributes.update")) return;
      if ("key" in body || "type" in body) {
        return err(res, 400, ["key should not exist", "type should not exist"], "Bad Request");
      }
      Object.assign(attribute, body);
      return send(res, 200, attribute);
    }
    if (method === "DELETE") {
      if (needs("attributes.delete")) return;
      if (db.categoryAttributes.some((l) => l.attributeId === attribute.id)) {
        return err(res, 409, "Attribute is linked to a category", "Conflict");
      }
      db.attributes = db.attributes.filter((a) => a.id !== attribute.id);
      return send(res, 204);
    }
  }

  // --- category ↔ attribute ------------------------------------------------
  if (path === "/category-attributes" && method === "GET") {
    const categoryId = url.searchParams.get("categoryId");
    return send(res, 200, db.categoryAttributes.filter((l) => l.categoryId === categoryId));
  }
  if (path === "/category-attributes" && method === "POST") {
    if (needs("attributes.update")) return;
    const exists = db.categoryAttributes.some(
      (l) => l.categoryId === body.categoryId && l.attributeId === body.attributeId,
    );
    if (exists) return err(res, 409, "Link already exists", "Conflict");
    const link = {
      categoryId: body.categoryId,
      attributeId: body.attributeId,
      isRequired: body.isRequired ?? false,
      isFilterable: body.isFilterable ?? true,
      createsVariant: body.createsVariant ?? false,
      sortOrder: body.sortOrder ?? 0,
    };
    db.categoryAttributes.push(link);
    return send(res, 201, link);
  }
  const unlinkMatch = path.match(/^\/category-attributes\/([^/]+)\/([^/]+)$/);
  if (unlinkMatch && method === "DELETE") {
    if (needs("attributes.update")) return;
    db.categoryAttributes = db.categoryAttributes.filter(
      (l) => !(l.categoryId === unlinkMatch[1] && l.attributeId === unlinkMatch[2]),
    );
    return send(res, 204);
  }

  // --- brands --------------------------------------------------------------
  if (path === "/brands" && method === "GET") return send(res, 200, db.brands);
  if (path === "/brands" && method === "POST") {
    if (needs("products.create")) return;
    const slug = body.slug || slugify(body.name);
    if (db.brands.some((b) => b.slug === slug)) {
      return err(res, 409, "Slug already exists", "Conflict");
    }
    const brand = {
      id: randomUUID(),
      name: body.name,
      slug,
      isActive: body.isActive ?? true,
    };
    db.brands.push(brand);
    return send(res, 201, brand);
  }
  const brandMatch = path.match(/^\/brands\/([^/]+)$/);
  if (brandMatch) {
    const brand = db.brands.find((b) => b.id === brandMatch[1]);
    if (!brand) return err(res, 404, "Brand not found", "Not Found");
    if (method === "GET") return send(res, 200, brand);
    if (method === "PATCH") {
      if (needs("products.update")) return;
      Object.assign(brand, body);
      return send(res, 200, brand);
    }
    if (method === "DELETE") {
      if (needs("products.delete")) return;
      db.brands = db.brands.filter((b) => b.id !== brand.id);
      return send(res, 204);
    }
  }

  // --- products ------------------------------------------------------------
  const variantAttrIds = (categoryId) =>
    db.categoryAttributes.filter((l) => l.categoryId === categoryId && l.createsVariant)
      .map((l) => l.attributeId);

  const priceRange = (productId) => {
    const amounts = db.variants
      .filter((v) => v.productId === productId)
      .flatMap((v) =>
        db.prices.filter((p) => p.variantId === v.id && p.priceListKey === "retail"),
      )
      .map((p) => p.amount);
    if (amounts.length === 0) return null;
    return { min: Math.min(...amounts), max: Math.max(...amounts) };
  };

  const availableFor = (variantId) =>
    db.levels
      .filter((l) => l.variantId === variantId)
      .reduce((sum, l) => sum + l.quantityOnHand - l.quantityReserved, 0);

  const productInStock = (productId) =>
    db.variants.some((v) => v.productId === productId && availableFor(v.id) > 0);

  const withDisplayPrice = (p) => ({
    ...p,
    displayPrice: priceRange(p.id),
    inStock: productInStock(p.id),
  });

  if (path === "/products" && method === "GET") {
    const q = url.searchParams.get("q")?.toLowerCase();
    const categoryId = url.searchParams.get("categoryId");
    const brandId = url.searchParams.get("brandId");
    const minPrice = url.searchParams.get("minPrice");
    const maxPrice = url.searchParams.get("maxPrice");

    let items = db.products.filter((p) => p.status === "PUBLISHED");
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q));
    if (categoryId) items = items.filter((p) => p.categoryId === categoryId);
    if (brandId) items = items.filter((p) => p.brandId === brandId);

    // `attr_<key>=value`: AND across different attributes. A product matches if
    // the value sits either on the product itself or on any of its variants.
    for (const [param, wanted] of url.searchParams.entries()) {
      if (!param.startsWith("attr_") || wanted === "") continue;
      const attribute = db.attributes.find((a) => a.key === param.slice(5));
      if (!attribute) continue;

      items = items.filter((product) => {
        const onProduct = (product.attributeValues ?? []).some(
          (v) => v.attributeId === attribute.id && v.value === wanted,
        );
        const onVariant = db.variants
          .filter((v) => v.productId === product.id)
          .some((variant) =>
            (variant.attributeValues ?? []).some(
              (v) => v.attributeId === attribute.id && v.value === wanted,
            ),
          );
        return onProduct || onVariant;
      });
    }

    items = items.map(withDisplayPrice);
    if (minPrice) {
      items = items.filter((p) => (p.displayPrice?.max ?? 0) >= Number(minPrice));
    }
    if (maxPrice) {
      items = items.filter(
        (p) => p.displayPrice !== null && p.displayPrice.min <= Number(maxPrice),
      );
    }

    return send(res, 200, { items, nextCursor: null });
  }

  // Admin listing: every status, unlike the PUBLISHED-only public one.
  if (path === "/products/admin" && method === "GET") {
    if (needs("products.read")) return;
    const q = url.searchParams.get("q")?.toLowerCase();
    const categoryId = url.searchParams.get("categoryId");
    const status = url.searchParams.get("status");

    let items = [...db.products];
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q));
    if (categoryId) items = items.filter((p) => p.categoryId === categoryId);
    if (status) items = items.filter((p) => p.status === status);

    return send(res, 200, { items: items.map(withDisplayPrice), nextCursor: null });
  }

  // --- media ---------------------------------------------------------------
  if (path === "/media" && method === "GET") {
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");
    return send(
      res,
      200,
      db.media.filter((m) => m.entityType === entityType && m.entityId === entityId),
    );
  }

  // --- cart ----------------------------------------------------------------
  const retailPrice = (variantId) =>
    db.prices.find((p) => p.variantId === variantId && p.priceListKey === "retail")
      ?.amount ?? null;

  /** `total` is null when any line has no retail price, per the contract. */
  const cartView = () => {
    const items = db.cart.items.map((item) => {
      const variant = db.variants.find((v) => v.id === item.variantId) ?? null;
      const product = variant
        ? db.products.find((p) => p.id === variant.productId)
        : null;
      return {
        ...item,
        variant: variant && {
          ...variant,
          prices: db.prices.filter((p) => p.variantId === variant.id),
          product: product && { id: product.id, name: product.name, slug: product.slug },
        },
      };
    });
    const amounts = items.map((item) => {
      const price = retailPrice(item.variantId);
      return price === null ? null : price * item.quantity;
    });
    const total = amounts.some((a) => a === null)
      ? null
      : amounts.reduce((sum, a) => sum + a, 0);
    return { id: db.cart.id, items, total };
  };

  if (path === "/cart" && method === "GET") {
    if (needsAuth()) return;
    return send(res, 200, cartView());
  }
  if (path === "/cart" && method === "DELETE") {
    if (needsAuth()) return;
    db.cart.items = [];
    return send(res, 204);
  }
  if (path === "/cart/items" && method === "POST") {
    if (needsAuth()) return;
    const variant = db.variants.find((v) => v.id === body.variantId);
    if (!variant) return err(res, 404, "Variant not found", "Not Found");

    const product = db.products.find((p) => p.id === variant.productId);
    if (product && body.quantity < product.minOrderQuantity) {
      return err(res, 400, "Below the minimum order quantity", "Bad Request");
    }

    const existing = db.cart.items.find((i) => i.variantId === body.variantId);
    // The contract is explicit: adding sums with what is already there.
    if (existing) existing.quantity += body.quantity;
    else
      db.cart.items.push({
        id: randomUUID(),
        variantId: body.variantId,
        quantity: body.quantity,
      });

    return send(res, 200, cartView());
  }
  const cartItemMatch = path.match(/^\/cart\/items\/([^/]+)$/);
  if (cartItemMatch) {
    if (needsAuth()) return;
    const item = db.cart.items.find((i) => i.id === cartItemMatch[1]);
    if (!item) return err(res, 404, "Cart item not found", "Not Found");

    if (method === "PATCH") {
      // Replaces outright; zero removes.
      if (body.quantity === 0) {
        db.cart.items = db.cart.items.filter((i) => i.id !== item.id);
      } else {
        item.quantity = body.quantity;
      }
      return send(res, 200, cartView());
    }
    if (method === "DELETE") {
      db.cart.items = db.cart.items.filter((i) => i.id !== item.id);
      return send(res, 204);
    }
  }

  // --- orders --------------------------------------------------------------
  if (path === "/orders" && method === "GET") {
    if (needs("orders.read")) return;
    const status = url.searchParams.get("status");
    const items = status ? db.orders.filter((o) => o.status === status) : db.orders;
    return send(res, 200, { items, nextCursor: null });
  }
  if (path === "/orders/my" && method === "GET") {
    if (needsAuth()) return;
    return send(res, 200, db.orders);
  }
  if (path === "/orders" && method === "POST") {
    if (needsAuth()) return;
    const cart = cartView();
    if (cart.items.length === 0) return err(res, 400, "Cart is empty", "Bad Request");
    if (cart.total === null) {
      return err(res, 400, "An item has no price", "Bad Request");
    }

    // Overselling guard: available is on hand minus what is already reserved.
    for (const item of cart.items) {
      const available = db.levels
        .filter((l) => l.variantId === item.variantId)
        .reduce((sum, l) => sum + l.quantityOnHand - l.quantityReserved, 0);
      if (available < item.quantity) {
        return err(res, 409, `insufficient stock for SKU ${item.variant?.sku}`, "Conflict");
      }
    }

    for (const item of cart.items) {
      const level = levelFor(item.variantId, defaultWarehouse().id);
      level.quantityReserved += item.quantity;
    }

    let discountAmount = 0;
    if (body.couponCode) {
      const coupon = db.coupons.find((c) => c.code === body.couponCode);
      if (!coupon) return err(res, 404, "Coupon not found", "Not Found");
      const outcome = evaluateCoupon(coupon, cart.total);
      if (typeof outcome === "string") {
        return err(res, 409, "Coupon unavailable: " + outcome, "Conflict");
      }
      // Consumed here, atomically with the order — validation never does.
      coupon.usedCount += 1;
      discountAmount = outcome;
    }

    const order = {
      id: randomUUID(),
      status: "PENDING_PAYMENT",
      total: Math.max(cart.total - discountAmount, 0),
      discountAmount,
      shippingAddress: body.shippingAddress,
      items: cart.items.map((item) => ({
        id: randomUUID(),
        variantId: item.variantId,
        sku: item.variant?.sku ?? "",
        quantity: item.quantity,
        unitPrice: retailPrice(item.variantId) ?? 0,
      })),
      createdAt: new Date().toISOString(),
      payments: [],
    };
    db.orders.push(order);
    db.cart.items = [];
    return send(res, 201, order);
  }
  const payMatch = path.match(/^\/orders\/([^/]+)\/pay$/);
  if (payMatch && method === "POST") {
    if (needsAuth()) return;
    const order = db.orders.find((o) => o.id === payMatch[1]);
    if (!order) return err(res, 404, "Order not found", "Not Found");

    const payment = {
      id: randomUUID(),
      orderId: order.id,
      status: body.simulateFailure ? "FAILED" : "SUCCEEDED",
      amount: order.total,
      provider: "mock",
      createdAt: new Date().toISOString(),
    };
    order.payments.push(payment);
    order.status = body.simulateFailure ? "PAYMENT_FAILED" : "PAID";
    return send(res, 201, payment);
  }
  const orderStatusMatch = path.match(/^\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch && method === "PATCH") {
    if (needsAuth()) return;
    const order = db.orders.find((o) => o.id === orderStatusMatch[1]);
    if (!order) return err(res, 404, "Order not found", "Not Found");

    // The owner may use this route, but only to cancel. Every other target
    // status needs `orders.updateStatus`.
    if (!allowed("orders.updateStatus") && body.status !== "CANCELLED") {
      return err(res, 403, "Only cancellation is allowed", "Forbidden");
    }

    order.status = body.status;
    return send(res, 200, order);
  }
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch && method === "GET") {
    if (needsAuth()) return;
    const order = db.orders.find((o) => o.id === orderMatch[1]);
    if (!order) return err(res, 404, "Order not found", "Not Found");
    // The detail embeds everything — no follow-up call for payments or
    // shipments, which is what makes refunds and tracking reachable.
    return send(res, 200, {
      ...order,
      shipments: db.shipments.filter((s) => s.orderId === order.id),
      statusHistory: order.statusHistory ?? [],
    });
  }

  // --- shipments -----------------------------------------------------------
  const shipmentsMatch = path.match(/^\/orders\/([^/]+)\/shipments$/);
  if (shipmentsMatch) {
    if (needs("orders.updateStatus")) return;
    const order = db.orders.find((o) => o.id === shipmentsMatch[1]);
    if (!order) return err(res, 404, "Order not found", "Not Found");

    if (method === "GET") {
      return send(res, 200, db.shipments.filter((s) => s.orderId === order.id));
    }
    if (method === "POST") {
      if (order.status !== "READY_TO_SHIP") {
        return err(res, 409, "Order is not ready to ship", "Conflict");
      }
      const shipment = {
        id: randomUUID(),
        orderId: order.id,
        carrier: body.carrier,
        trackingNumber: body.trackingNumber,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      db.shipments.push(shipment);
      // Creating a shipment moves the order along by itself.
      order.status = "SHIPPED";
      return send(res, 201, shipment);
    }
  }

  const deliverMatch = path.match(/^\/shipments\/([^/]+)\/deliver$/);
  if (deliverMatch && method === "POST") {
    if (needs("orders.updateStatus")) return;
    const shipment = db.shipments.find((s) => s.id === deliverMatch[1]);
    if (!shipment) return err(res, 404, "Shipment not found", "Not Found");
    shipment.status = "DELIVERED";
    const order = db.orders.find((o) => o.id === shipment.orderId);
    if (order) order.status = "DELIVERED";
    return send(res, 200, shipment);
  }

  // --- bulk prices ---------------------------------------------------------
  if (path === "/prices/bulk" && method === "POST") {
    if (needs("prices.update")) return;
    let updated = 0;
    for (const update of body.updates ?? []) {
      if (!db.variants.some((v) => v.id === update.variantId)) continue;
      const existing = db.prices.find(
        (p) => p.variantId === update.variantId && p.priceListKey === update.priceListKey,
      );
      if (existing) existing.amount = update.amount;
      else db.prices.push({ ...update });
      updated += 1;
    }
    return send(res, 200, { updated });
  }
  if (path === "/products" && method === "POST") {
    if (needs("products.create")) return;
    const category = db.categories.find((c) => c.id === body.categoryId);
    if (!category) return err(res, 404, "Category not found", "Not Found");
    if (body.brandId && !db.brands.some((b) => b.id === body.brandId)) {
      return err(res, 404, "Brand not found", "Not Found");
    }

    const variantAttrs = variantAttrIds(body.categoryId);
    if (variantAttrs.length > 0 && body.type !== "VARIABLE") {
      return err(res, 400, "This category requires a VARIABLE product", "Bad Request");
    }

    // Required informational attributes must be present.
    const required = db.categoryAttributes.filter(
      (l) => l.categoryId === body.categoryId && !l.createsVariant && l.isRequired,
    );
    const provided = new Set((body.attributeValues ?? []).map((v) => v.attributeId));
    const missing = required.filter((l) => !provided.has(l.attributeId));
    if (missing.length > 0) {
      return err(res, 400, "Missing required attribute values", "Bad Request");
    }

    const slug = body.slug || slugify(body.name);
    if (db.products.some((p) => p.slug === slug)) {
      return err(res, 409, "Slug already exists", "Conflict");
    }
    if (body.type === "SIMPLE") {
      if (!body.sku) return err(res, 400, "sku is required for SIMPLE", "Bad Request");
      if (db.variants.some((v) => v.sku === body.sku)) {
        return err(res, 409, "SKU already exists", "Conflict");
      }
    }

    const product = {
      id: randomUUID(),
      categoryId: body.categoryId,
      brandId: body.brandId ?? null,
      name: body.name,
      slug,
      description: body.description ?? null,
      type: body.type,
      status: "DRAFT",
      sellingUnit: body.sellingUnit,
      minOrderQuantity: body.minOrderQuantity,
      attributeValues: body.attributeValues ?? [],
    };
    db.products.push(product);

    if (body.type === "SIMPLE") {
      db.variants.push({
        id: randomUUID(),
        productId: product.id,
        sku: body.sku,
        barcode: body.barcode ?? null,
        weight: body.weight ?? null,
        status: "ACTIVE",
        attributeValues: [],
      });
    }

    return send(res, 201, withDisplayPrice(product));
  }

  const variantsMatch = path.match(/^\/products\/([^/]+)\/variants$/);
  if (variantsMatch) {
    if (needs(method === "GET" ? "products.read" : "products.update")) return;
    const product = db.products.find((p) => p.id === variantsMatch[1]);
    if (!product) return err(res, 404, "Product not found", "Not Found");

    if (method === "GET") {
      return send(
        res,
        200,
        db.variants
          .filter((v) => v.productId === product.id)
          .map((v) => ({ ...v, prices: db.prices.filter((p) => p.variantId === v.id) })),
      );
    }
    if (method === "POST") {
      if (product.type !== "VARIABLE") {
        return err(res, 400, "Only VARIABLE products take variants", "Bad Request");
      }
      const expected = variantAttrIds(product.categoryId);
      const given = (body.attributeValues ?? []).map((v) => v.attributeId).sort();
      if (JSON.stringify(given) !== JSON.stringify([...expected].sort())) {
        return err(
          res,
          400,
          "Variant attributes must cover exactly the variant-creating attributes",
          "Bad Request",
        );
      }
      // Each value is checked against its attribute's option list.
      for (const value of body.attributeValues ?? []) {
        const attribute = db.attributes.find((a) => a.id === value.attributeId);
        if (!attribute) return err(res, 400, "Unknown attribute", "Bad Request");
        if (
          (attribute.type === "SELECT" || attribute.type === "COLOR_SELECT") &&
          !attribute.options.some((o) => o.value === value.value)
        ) {
          return err(res, 400, `Invalid value for ${attribute.key}`, "Bad Request");
        }
      }
      if (db.variants.some((v) => v.sku === body.sku)) {
        return err(res, 409, "SKU already exists", "Conflict");
      }
      const signature = (values) =>
        JSON.stringify([...values].sort((a, b) => a.attributeId.localeCompare(b.attributeId)));
      if (
        db.variants.some(
          (v) =>
            v.productId === product.id &&
            signature(v.attributeValues) === signature(body.attributeValues ?? []),
        )
      ) {
        return err(res, 409, "A variant with these attributes exists", "Conflict");
      }

      const variant = {
        id: randomUUID(),
        productId: product.id,
        sku: body.sku,
        barcode: body.barcode ?? null,
        weight: body.weight ?? null,
        status: "ACTIVE",
        attributeValues: body.attributeValues ?? [],
      };
      db.variants.push(variant);
      return send(res, 201, variant);
    }
  }

  const variantStatusMatch = path.match(/^\/products\/([^/]+)\/variants\/([^/]+)\/status$/);
  if (variantStatusMatch && method === "PATCH") {
    if (needs("products.update")) return;
    const variant = db.variants.find((v) => v.id === variantStatusMatch[2]);
    if (!variant) return err(res, 404, "Variant not found", "Not Found");
    variant.status = body.status;
    return send(res, 200, variant);
  }

  const variantMatch = path.match(/^\/products\/([^/]+)\/variants\/([^/]+)$/);
  if (variantMatch) {
    if (needs(method === "DELETE" ? "products.delete" : "products.read")) return;
    const variant = db.variants.find((v) => v.id === variantMatch[2]);
    if (!variant) return err(res, 404, "Variant not found", "Not Found");
    if (method === "GET") {
      return send(res, 200, {
        ...variant,
        prices: db.prices.filter((p) => p.variantId === variant.id),
      });
    }
    if (method === "DELETE") {
      const siblings = db.variants.filter((v) => v.productId === variant.productId);
      if (siblings.length <= 1) {
        return err(res, 409, "Cannot delete the last variant", "Conflict");
      }
      db.variants = db.variants.filter((v) => v.id !== variant.id);
      return send(res, 204);
    }
  }

  const productSlugMatch = path.match(/^\/products\/slug\/([^/]+)$/);
  if (productSlugMatch && method === "GET") {
    const product = db.products.find(
      (p) => p.slug === decodeURIComponent(productSlugMatch[1]) && p.status === "PUBLISHED",
    );
    if (!product) return err(res, 404, "Product not found", "Not Found");
    // The contract says this one "includes all variants, their attributes and
    // their prices" — unlike the admin `GET /products/:id`.
    return send(res, 200, {
      ...withDisplayPrice(product),
      variants: db.variants
        .filter((v) => v.productId === product.id)
        .map((v) => ({
          ...v,
          prices: db.prices.filter((p) => p.variantId === v.id),
          inStock: availableFor(v.id) > 0,
        })),
    });
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const product = db.products.find((p) => p.id === productMatch[1]);
    if (!product) return err(res, 404, "Product not found", "Not Found");
    if (method === "GET") {
      if (needs("products.read")) return;
      return send(res, 200, withDisplayPrice(product));
    }
    if (method === "PATCH") {
      if (needs("products.update")) return;
      if ("categoryId" in body || "type" in body) {
        return err(res, 400, "categoryId and type are immutable", "Bad Request");
      }
      if (body.slug && db.products.some((p) => p.slug === body.slug && p.id !== product.id)) {
        return err(res, 409, "Slug already exists", "Conflict");
      }
      Object.assign(product, body);
      return send(res, 200, withDisplayPrice(product));
    }
    if (method === "DELETE") {
      if (needs("products.delete")) return;
      if (product.status === "PUBLISHED") {
        return err(res, 409, "Archive the product before deleting", "Conflict");
      }
      db.products = db.products.filter((p) => p.id !== product.id);
      db.variants = db.variants.filter((v) => v.productId !== product.id);
      return send(res, 204);
    }
  }

  // --- prices --------------------------------------------------------------
  const priceMatch = path.match(/^\/variants\/([^/]+)\/prices$/);
  if (priceMatch && method === "POST") {
    if (needs("prices.update")) return;
    const variant = db.variants.find((v) => v.id === priceMatch[1]);
    if (!variant) return err(res, 404, "Variant not found", "Not Found");
    const existing = db.prices.find(
      (p) => p.variantId === variant.id && p.priceListKey === body.priceListKey,
    );
    if (existing) {
      existing.amount = body.amount;
      return send(res, 200, existing);
    }
    const price = {
      variantId: variant.id,
      priceListKey: body.priceListKey,
      amount: body.amount,
    };
    db.prices.push(price);
    return send(res, 201, price);
  }

  // --- warehouses ----------------------------------------------------------
  if (path === "/warehouses" && method === "GET") {
    if (needs("warehouses.manage")) return;
    return send(res, 200, db.warehouses);
  }
  const warehouseMatch = path.match(/^\/warehouses\/([^/]+)$/);
  if (warehouseMatch) {
    if (needs("warehouses.manage")) return;
    const warehouse = db.warehouses.find((w) => w.id === warehouseMatch[1]);
    if (!warehouse) return err(res, 404, "Warehouse not found", "Not Found");

    if (method === "GET") return send(res, 200, warehouse);
    if (method === "PATCH") {
      // Orders fall back to the first active warehouse, so one must remain.
      const disabling = body.isActive === false && warehouse.isActive;
      const othersActive = db.warehouses.filter(
        (w) => w.isActive && w.id !== warehouse.id,
      ).length;
      if (disabling && othersActive === 0) {
        return err(res, 409, "At least one warehouse must stay active", "Conflict");
      }
      // The code identifies the warehouse in stock movements and is immutable.
      const { code: _immutable, ...rest } = body;
      Object.assign(warehouse, rest);
      return send(res, 200, warehouse);
    }
  }

  // --- customers -----------------------------------------------------------
  const priceListMatch = path.match(/^\/customers\/([^/]+)\/price-list$/);
  if (priceListMatch && method === "PATCH") {
    if (needs("prices.update")) return;
    db.customerPriceLists[priceListMatch[1]] = body.priceListKey ?? null;
    return send(res, 200, {
      customerId: priceListMatch[1],
      priceListKey: body.priceListKey ?? null,
    });
  }

  if (path === "/warehouses" && method === "POST") {
    if (needs("warehouses.manage")) return;
    if (db.warehouses.some((w) => w.code === body.code)) {
      return err(res, 409, "Warehouse code already exists", "Conflict");
    }
    const warehouse = {
      id: randomUUID(),
      code: body.code,
      name: body.name,
      isActive: body.isActive ?? true,
    };
    db.warehouses.push(warehouse);
    return send(res, 201, warehouse);
  }

  // --- inventory -----------------------------------------------------------
  if (path === "/inventory" && method === "GET") {
    if (needs("inventory.read")) return;
    const variantId = url.searchParams.get("variantId");
    return send(res, 200, db.levels.filter((l) => l.variantId === variantId));
  }
  if (path === "/inventory/movements" && method === "GET") {
    if (needs("inventory.read")) return;
    const variantId = url.searchParams.get("variantId");
    return send(
      res,
      200,
      db.movements
        .filter((m) => m.variantId === variantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  if (path === "/inventory/receive" && method === "POST") {
    if (needs("inventory.adjust")) return;
    if (!db.variants.some((v) => v.id === body.variantId)) {
      return err(res, 404, "Variant not found", "Not Found");
    }
    const warehouse = body.warehouseId
      ? db.warehouses.find((w) => w.id === body.warehouseId)
      : defaultWarehouse();
    if (!warehouse) return err(res, 404, "Warehouse not found", "Not Found");

    const level = levelFor(body.variantId, warehouse.id);
    level.quantityOnHand += body.quantity;

    const movement = {
      id: randomUUID(),
      variantId: body.variantId,
      warehouseId: warehouse.id,
      type: "RECEIPT",
      quantity: body.quantity,
      reason: body.reason ?? null,
      createdAt: new Date().toISOString(),
    };
    db.movements.push(movement);
    return send(res, 201, movement);
  }
  if (path === "/inventory/adjustments" && method === "POST") {
    if (needs("inventory.adjust")) return;
    if (!body.reason) return err(res, 400, "reason is required", "Bad Request");
    if (!db.variants.some((v) => v.id === body.variantId)) {
      return err(res, 404, "Variant not found", "Not Found");
    }
    const warehouse = body.warehouseId
      ? db.warehouses.find((w) => w.id === body.warehouseId)
      : defaultWarehouse();
    if (!warehouse) return err(res, 404, "Warehouse not found", "Not Found");

    const level = levelFor(body.variantId, warehouse.id);
    const next = level.quantityOnHand + body.quantityDelta;
    if (next < level.quantityReserved) {
      return err(res, 409, "Adjustment would drop below reserved quantity", "Conflict");
    }
    level.quantityOnHand = next;

    const movement = {
      id: randomUUID(),
      variantId: body.variantId,
      warehouseId: warehouse.id,
      type: "ADJUSTMENT",
      quantity: body.quantityDelta,
      reason: body.reason,
      createdAt: new Date().toISOString(),
    };
    db.movements.push(movement);
    return send(res, 201, movement);
  }
  // Test-only: pretend open orders have reserved some stock.
  if (path === "/__reserve" && method === "POST") {
    const level = levelFor(body.variantId, defaultWarehouse().id);
    level.quantityReserved = body.quantity;
    return send(res, 200, level);
  }

  // --- coupons -------------------------------------------------------------
  if (path === "/coupons" && method === "GET") {
    if (needs("promotions.manage")) return;
    return send(res, 200, db.coupons);
  }
  if (path === "/coupons" && method === "POST") {
    if (needs("promotions.manage")) return;
    if (db.coupons.some((c) => c.code === body.code)) {
      return err(res, 409, "Coupon code already exists", "Conflict");
    }
    const coupon = {
      id: randomUUID(),
      code: body.code,
      type: body.type,
      value: body.value,
      maxUses: body.maxUses ?? null,
      usedCount: 0,
      minOrderTotal: body.minOrderTotal ?? null,
      startsAt: body.startsAt ?? null,
      expiresAt: body.expiresAt ?? null,
      isActive: body.isActive ?? true,
    };
    db.coupons.push(coupon);
    return send(res, 201, coupon);
  }
  // Validation needs a session but no special permission — it is what the
  // storefront calls to preview a discount.
  if (path === "/coupons/validate" && method === "POST") {
    if (needsAuth()) return;
    const coupon = db.coupons.find((c) => c.code === body.code);
    if (!coupon) return err(res, 404, "Coupon not found", "Not Found");

    const outcome = evaluateCoupon(coupon, body.subtotal ?? 0);
    if (typeof outcome === "string") {
      return send(res, 200, { valid: false, reason: outcome });
    }
    return send(res, 200, { valid: true, discountAmount: outcome, coupon });
  }
  const couponMatch = path.match(/^\/coupons\/([^/]+)$/);
  if (couponMatch) {
    if (needs("promotions.manage")) return;
    const coupon = db.coupons.find((c) => c.id === couponMatch[1]);
    if (!coupon) return err(res, 404, "Coupon not found", "Not Found");
    if (method === "GET") return send(res, 200, coupon);
    if (method === "PATCH") {
      if (
        body.code &&
        db.coupons.some((c) => c.code === body.code && c.id !== coupon.id)
      ) {
        return err(res, 409, "Coupon code already exists", "Conflict");
      }
      Object.assign(coupon, body);
      return send(res, 200, coupon);
    }
  }

  // --- reports -------------------------------------------------------------
  // Everything from PAID onwards counts as revenue; pending, cancelled and
  // failed orders do not.
  const EARNED = new Set([
    "PAID",
    "CONFIRMED",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "RETURN_REQUESTED",
    "RETURNED",
    "REFUNDED",
  ]);

  if (path === "/reports/sales" && method === "GET") {
    if (needs("reports.view")) return;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const earned = db.orders.filter((o) => {
      if (!EARNED.has(o.status)) return false;
      if (from && o.createdAt < from) return false;
      if (to && o.createdAt > to) return false;
      return true;
    });

    const byDay = new Map();
    for (const order of earned) {
      const day = `${order.createdAt.slice(0, 10)}T00:00:00.000Z`;
      const entry = byDay.get(day) ?? { date: day, revenue: 0, orderCount: 0 };
      entry.revenue += order.total;
      entry.orderCount += 1;
      byDay.set(day, entry);
    }

    return send(res, 200, {
      totalRevenue: earned.reduce((sum, o) => sum + o.total, 0),
      orderCount: earned.length,
      byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    });
  }

  if (path === "/reports/low-stock" && method === "GET") {
    if (needs("reports.view")) return;
    const threshold = Number(url.searchParams.get("threshold") ?? 5);

    const rows = db.levels
      .map((level) => {
        const variant = db.variants.find((v) => v.id === level.variantId);
        const product = variant
          ? db.products.find((p) => p.id === variant.productId)
          : null;
        const warehouse = db.warehouses.find((w) => w.id === level.warehouseId);
        return {
          ...level,
          available: level.quantityOnHand - level.quantityReserved,
          sku: variant?.sku,
          productId: product?.id,
          productName: product?.name,
          warehouseCode: warehouse?.code,
        };
      })
      .filter((row) => row.available <= threshold)
      .sort((a, b) => a.available - b.available);

    return send(res, 200, rows);
  }

  if (path === "/reports/stagnant-products" && method === "GET") {
    if (needs("reports.view")) return;
    const days = Number(url.searchParams.get("days") ?? 30);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const orderedVariantIds = new Set(
      db.orders
        .filter((o) => new Date(o.createdAt).getTime() >= cutoff)
        .flatMap((o) => o.items.map((i) => i.variantId)),
    );

    const stagnant = db.products
      .filter((p) => p.status === "PUBLISHED")
      .filter(
        (p) =>
          !db.variants.some(
            (v) => v.productId === p.id && orderedVariantIds.has(v.id),
          ),
      )
      .map((p) => ({ id: p.id, name: p.name, slug: p.slug, lastOrderedAt: null }));

    return send(res, 200, stagnant);
  }

  // --- test helpers --------------------------------------------------------
  if (path === "/__media" && method === "POST") {
    const media = {
      id: randomUUID(),
      entityType: body.entityType,
      entityId: body.entityId,
      key: `${body.entityType}/${body.entityId}/img.png`,
      url: `http://localhost:9000/bucket/${body.entityId}.png`,
      sortOrder: body.sortOrder ?? 0,
    };
    db.media.push(media);
    return send(res, 201, media);
  }
  if (path === "/__reset" && method === "POST") {
    db.users = seedUsers();
    db.categories = [];
    db.attributes = [];
    db.categoryAttributes = [];
    db.brands = [];
    db.products = [];
    db.variants = [];
    db.prices = [];
    db.media = [];
    db.orders = [];
    db.shipments = [];
    db.coupons = [];
    db.customerPriceLists = {};
    db.cart = { id: "cart-1", items: [], total: 0 };
    db.levels = [];
    db.movements = [];
    db.warehouses = [
      { id: randomUUID(), code: "MAIN", name: "المستودع الرئيسي", isActive: true },
    ];
    log.length = 0;
    return send(res, 204);
  }
  if (path === "/__log") return send(res, 200, log);
  if (path === "/__db") return send(res, 200, db);
  if (path === "/__role" && method === "POST") {
    USER.roleKey = body.roleKey ?? USER.roleKey;
    USER.permissions = body.permissions ?? USER.permissions;
    return send(res, 200, USER);
  }

  err(res, 404, "Not found", "Not Found");
});

server.listen(PORT, () => console.log(`mock catalog api on ${PORT}`));
