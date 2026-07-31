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

const db = {
  categories: [],
  attributes: [],
  categoryAttributes: [],
  brands: [],
  products: [],
  variants: [],
  prices: [],
  media: [],
  orders: [],
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

/** Rebuilds `path` for a category and everything under it. */
function rebuildPaths() {
  const byId = new Map(db.categories.map((c) => [c.id, c]));
  const pathOf = (c) => {
    const chain = [];
    let node = c;
    const seen = new Set();
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      chain.unshift(node.slug);
      node = node.parentId ? byId.get(node.parentId) : null;
    }
    return `/${chain.join("/")}`;
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
    if (needsAuth()) return;
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
        categoryAttributes: db.categoryAttributes.filter(
          (l) => l.categoryId === category.id,
        ),
      });
    }
    if (method === "PATCH") {
      if (needsAuth()) return;
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
      if (needsAuth()) return;
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
    if (needsAuth()) return;
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
    if (needsAuth()) return;
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
      if (needsAuth()) return;
      if ("key" in body || "type" in body) {
        return err(res, 400, ["key should not exist", "type should not exist"], "Bad Request");
      }
      Object.assign(attribute, body);
      return send(res, 200, attribute);
    }
    if (method === "DELETE") {
      if (needsAuth()) return;
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
    if (needsAuth()) return;
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
    if (needsAuth()) return;
    db.categoryAttributes = db.categoryAttributes.filter(
      (l) => !(l.categoryId === unlinkMatch[1] && l.attributeId === unlinkMatch[2]),
    );
    return send(res, 204);
  }

  // --- brands --------------------------------------------------------------
  if (path === "/brands" && method === "GET") return send(res, 200, db.brands);
  if (path === "/brands" && method === "POST") {
    if (needsAuth()) return;
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
      if (needsAuth()) return;
      Object.assign(brand, body);
      return send(res, 200, brand);
    }
    if (method === "DELETE") {
      if (needsAuth()) return;
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

  const withDisplayPrice = (p) => ({ ...p, displayPrice: priceRange(p.id) });

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
    const items = db.cart.items.map((item) => ({
      ...item,
      variant: db.variants.find((v) => v.id === item.variantId) ?? null,
    }));
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
    if (needsAuth()) return;
    return send(res, 200, db.orders);
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

    const order = {
      id: randomUUID(),
      status: "PENDING_PAYMENT",
      total: cart.total,
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
    order.status = body.status;
    return send(res, 200, order);
  }
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch && method === "GET") {
    if (needsAuth()) return;
    const order = db.orders.find((o) => o.id === orderMatch[1]);
    if (!order) return err(res, 404, "Order not found", "Not Found");
    return send(res, 200, order);
  }

  // --- bulk prices ---------------------------------------------------------
  if (path === "/prices/bulk" && method === "POST") {
    if (needsAuth()) return;
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
    if (needsAuth()) return;
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
    if (needsAuth()) return;
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
    if (needsAuth()) return;
    const variant = db.variants.find((v) => v.id === variantStatusMatch[2]);
    if (!variant) return err(res, 404, "Variant not found", "Not Found");
    variant.status = body.status;
    return send(res, 200, variant);
  }

  const variantMatch = path.match(/^\/products\/([^/]+)\/variants\/([^/]+)$/);
  if (variantMatch) {
    if (needsAuth()) return;
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
        .map((v) => ({ ...v, prices: db.prices.filter((p) => p.variantId === v.id) })),
    });
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const product = db.products.find((p) => p.id === productMatch[1]);
    if (!product) return err(res, 404, "Product not found", "Not Found");
    if (method === "GET") {
      if (needsAuth()) return;
      return send(res, 200, withDisplayPrice(product));
    }
    if (method === "PATCH") {
      if (needsAuth()) return;
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
      if (needsAuth()) return;
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
    if (needsAuth()) return;
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
    if (needsAuth()) return;
    return send(res, 200, db.warehouses);
  }
  if (path === "/warehouses" && method === "POST") {
    if (needsAuth()) return;
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
    if (needsAuth()) return;
    const variantId = url.searchParams.get("variantId");
    return send(res, 200, db.levels.filter((l) => l.variantId === variantId));
  }
  if (path === "/inventory/movements" && method === "GET") {
    if (needsAuth()) return;
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
    if (needsAuth()) return;
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
    if (needsAuth()) return;
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

  // --- test helpers --------------------------------------------------------
  if (path === "/__reset" && method === "POST") {
    db.categories = [];
    db.attributes = [];
    db.categoryAttributes = [];
    db.brands = [];
    db.products = [];
    db.variants = [];
    db.prices = [];
    db.media = [];
    db.orders = [];
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
