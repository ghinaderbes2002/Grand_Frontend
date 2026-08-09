/**
 * Probes a running backend and reports where it differs from the assumptions
 * this frontend was built on.
 *
 * The frontend was written from API_CONTRACT.md alone. Where the contract is
 * silent — the status a new product gets, the shape of an inventory movement,
 * whether a variant embeds its prices — the code had to assume something. This
 * script checks each of those against the real thing.
 *
 *   node scripts/verify-contract.mjs                  # read-only probes
 *   VERIFY_WRITES=1 node scripts/verify-contract.mjs  # also create/delete data
 *
 * Env:
 *   API_BASE_URL      default http://localhost:3000
 *   VERIFY_EMAIL      default admin@printing-store.local
 *   VERIFY_PASSWORD   default ChangeMe123!
 *   VERIFY_WRITES     set to 1 to run the write probes
 *
 * The write probes create records prefixed `zz-verify-` and delete them again
 * on the way out. Point this at a development database, never production.
 */

const BASE = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VERIFY_EMAIL ?? "admin@printing-store.local";
const PASSWORD = process.env.VERIFY_PASSWORD ?? "ChangeMe123!";
const WRITES = process.env.VERIFY_WRITES === "1";

const PREFIX = `zz-verify-${Date.now().toString(36)}`;

const findings = [];
let accessToken = null;

const C = {
  reset: "[0m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  cyan: "[36m",
};

/** Records one comparison between what the frontend assumes and what came back. */
function record(area, assumption, verdict, detail = "") {
  // A later pass supersedes an earlier one: the read probes run again once the
  // write phase has created sample data, which turns UNKNOWNs into answers.
  const previous = findings.findIndex(
    (f) => f.area === area && f.assumption === assumption,
  );
  if (previous !== -1) findings.splice(previous, 1);

  findings.push({ area, assumption, verdict, detail });
  const colour =
    verdict === "MATCH" ? C.green : verdict === "MISMATCH" ? C.red : C.yellow;
  const label = verdict.padEnd(8);
  console.log(
    `${colour}${label}${C.reset} ${C.dim}${area}${C.reset}  ${assumption}` +
      (detail ? `\n         ${C.dim}${detail}${C.reset}` : ""),
  );
}

async function call(method, path, { body, auth = true, query } = {}) {
  const url = new URL(path, `${BASE}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new Error(`${method} ${path} — could not reach ${BASE}: ${cause.message}`);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: response.status, data };
}

const has = (object, key) =>
  object !== null && typeof object === "object" && key in object;

/** Reports which of `keys` are present on `sample`. */
function checkShape(area, label, sample, keys) {
  if (!sample) {
    record(area, label, "UNKNOWN", "no sample record available");
    return;
  }
  const missing = keys.filter((key) => !has(sample, key));
  if (missing.length === 0) {
    record(area, label, "MATCH", `keys: ${Object.keys(sample).join(", ")}`);
  } else {
    record(
      area,
      label,
      "MISMATCH",
      `missing: ${missing.join(", ")} · actual keys: ${Object.keys(sample).join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------

async function verifyAuth() {
  const login = await call("POST", "/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
    auth: false,
  });

  if (login.status !== 200 || !login.data?.accessToken) {
    record(
      "auth",
      "POST /auth/login returns { accessToken, refreshToken }",
      "MISMATCH",
      `status ${login.status} · ${JSON.stringify(login.data)?.slice(0, 200)}`,
    );
    throw new Error("cannot continue without a session");
  }

  accessToken = login.data.accessToken;
  checkShape("auth", "login response shape", login.data, ["accessToken", "refreshToken"]);

  const me = await call("GET", "/auth/me");
  checkShape("auth", "GET /auth/me returns { id, roleKey, permissions }", me.data, [
    "id",
    "roleKey",
    "permissions",
  ]);

  // lib/auth/permissions.ts treats super_admin as all-powerful precisely
  // because the contract never says what this array holds.
  if (me.data?.roleKey === "super_admin") {
    const count = Array.isArray(me.data.permissions) ? me.data.permissions.length : -1;
    record(
      "auth",
      "super_admin's permissions array",
      count > 0 ? "MATCH" : "MISMATCH",
      count > 0
        ? `${count} permissions listed — the super_admin special case in permissions.ts is redundant but harmless`
        : "empty — the super_admin special case in lib/auth/permissions.ts is REQUIRED, do not remove it",
    );
  } else {
    record("auth", "seed account is super_admin", "UNKNOWN", `roleKey: ${me.data?.roleKey}`);
  }

  // One rotation only. Replaying a spent token would revoke every session.
  const refreshed = await call("POST", "/auth/refresh", {
    body: { refreshToken: login.data.refreshToken },
    auth: false,
  });
  if (refreshed.status === 200 && refreshed.data?.refreshToken) {
    record(
      "auth",
      "refresh rotates the refresh token",
      refreshed.data.refreshToken !== login.data.refreshToken ? "MATCH" : "MISMATCH",
      refreshed.data.refreshToken === login.data.refreshToken
        ? "same token returned — the rotation handling in lib/auth/refresh.ts assumes it changes"
        : "",
    );
    accessToken = refreshed.data.accessToken;
  } else {
    record("auth", "POST /auth/refresh", "MISMATCH", `status ${refreshed.status}`);
  }
}

/**
 * The `/users` payload is the least pinned-down in the contract — it names the
 * entity and promises only that `passwordHash` never appears. Everything the
 * admin panel renders from it is an inference, so it all gets checked here.
 */
async function verifyUsers() {
  const users = await call("GET", "/users");

  if (users.status === 403) {
    record("users", "GET /users", "UNKNOWN", "this account lacks users.manage");
    return;
  }
  record(
    "users",
    "GET /users returns an array",
    Array.isArray(users.data) ? "MATCH" : "MISMATCH",
    Array.isArray(users.data) ? `${users.data.length} accounts` : `status ${users.status}`,
  );

  const sample = users.data?.[0];
  checkShape("users", "user shape", sample, [
    "id",
    "email",
    "firstName",
    "lastName",
    "roleKey",
    "status",
  ]);

  if (sample) {
    // The contract states this flatly; a leak here would be a real problem, so
    // it is worth confirming rather than trusting.
    const leaked = Object.keys(sample).filter((key) => /password|hash/i.test(key));
    record(
      "users",
      "no password material in the response",
      leaked.length === 0 ? "MATCH" : "MISMATCH",
      leaked.length === 0 ? "" : `leaked: ${leaked.join(", ")}`,
    );

    const statuses = [...new Set(users.data.map((user) => user.status))];
    const known = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DISABLED"];
    const unknown = statuses.filter((status) => !known.includes(status));
    record(
      "users",
      "statuses are the four documented ones",
      unknown.length === 0 ? "MATCH" : "MISMATCH",
      unknown.length === 0
        ? `seen: ${statuses.join(", ")}`
        : `undocumented: ${unknown.join(", ")} — lib/i18n dictionaries have no label for these`,
    );
  }
}

async function verifyCatalogReads() {
  const categories = await call("GET", "/categories", { auth: false });
  record(
    "categories",
    "GET /categories returns an array",
    Array.isArray(categories.data) ? "MATCH" : "MISMATCH",
    Array.isArray(categories.data) ? `${categories.data.length} records` : "",
  );
  checkShape("categories", "category shape", categories.data?.[0], [
    "id",
    "name",
    "slug",
    "parentId",
    "path",
    "sortOrder",
    "isActive",
  ]);

  const tree = await call("GET", "/categories/tree", { auth: false });
  checkShape("categories", "tree node shape", tree.data?.[0], [
    "id",
    "name",
    "slug",
    "sortOrder",
    "isActive",
    "children",
  ]);

  if (categories.data?.[0]?.id) {
    const detail = await call("GET", `/categories/${categories.data[0].id}`, {
      auth: false,
    });
    record(
      "categories",
      "GET /categories/:id embeds categoryAttributes",
      has(detail.data, "categoryAttributes") ? "MATCH" : "MISMATCH",
      `keys: ${Object.keys(detail.data ?? {}).join(", ")}`,
    );

    const links = await call("GET", "/category-attributes", {
      auth: false,
      query: { categoryId: categories.data[0].id },
    });
    checkShape("category-attributes", "link shape", links.data?.[0], [
      "categoryId",
      "attributeId",
      "isRequired",
      "isFilterable",
      "createsVariant",
      "sortOrder",
    ]);
    // The embedded copy is a trap: it exists but is stripped of `options`, so
    // a SELECT field built from it silently has nothing to choose. Everything
    // in the UI resolves against `/attributes` instead — this probe is here to
    // catch the day that stops being necessary, not to license using it.
    const embedded = links.data?.[0]?.attribute;
    if (links.data?.[0]) {
      record(
        "category-attributes",
        "embedded attribute carries its options",
        !embedded ? "UNKNOWN" : has(embedded, "options") ? "MATCH" : "MISMATCH",
        !embedded
          ? "not embedded at all — the UI resolves via /attributes, no change needed"
          : has(embedded, "options")
            ? "embedded with options"
            : `stripped of options (keys: ${Object.keys(embedded).join(", ")}) — the UI must keep preferring /attributes`,
      );
    }
  }

  const attributes = await call("GET", "/attributes", { auth: false });
  checkShape("attributes", "attribute shape", attributes.data?.[0], [
    "id",
    "key",
    "name",
    "type",
    "unit",
    "isFilterable",
    "options",
  ]);
  const option = attributes.data?.find((a) => a.options?.length)?.options?.[0];
  checkShape("attributes", "option shape", option, ["id", "value", "label", "sortOrder"]);

  const brands = await call("GET", "/brands", { auth: false });
  checkShape("brands", "brand shape", brands.data?.[0], ["id", "name", "slug", "isActive"]);

  const warehouses = await call("GET", "/warehouses");
  checkShape("warehouses", "warehouse shape", warehouses.data?.[0], [
    "id",
    "code",
    "name",
    "isActive",
  ]);

  const products = await call("GET", "/products", { auth: false, query: { limit: 5 } });
  checkShape("products", "GET /products returns { items, nextCursor }", products.data, [
    "items",
    "nextCursor",
  ]);
  if (products.data?.items?.[0]) {
    record(
      "products",
      "list items carry displayPrice",
      has(products.data.items[0], "displayPrice") ? "MATCH" : "MISMATCH",
      `keys: ${Object.keys(products.data.items[0]).join(", ")}`,
    );
  }
}

async function verifyWrites() {
  const created = {
    category: null,
    attribute: null,
    product: null,
    brand: null,
    linked: false,
  };

  try {
    // --- category ---------------------------------------------------------
    const category = await call("POST", "/categories", {
      body: { name: `${PREFIX}-category`, isActive: true },
    });
    record(
      "categories",
      "POST /categories returns the created record with an id",
      category.status === 201 && has(category.data, "id") ? "MATCH" : "MISMATCH",
      `status ${category.status} · keys: ${Object.keys(category.data ?? {}).join(", ")}`,
    );
    if (!has(category.data, "id")) return created;
    created.category = category.data.id;

    // --- attribute + link -------------------------------------------------
    const attribute = await call("POST", "/attributes", {
      body: {
        key: PREFIX.replace(/-/g, "_"),
        name: `${PREFIX}-attribute`,
        type: "SELECT",
        isFilterable: true,
      },
    });
    if (has(attribute.data, "id")) {
      created.attribute = attribute.data.id;
      await call("POST", `/attributes/${attribute.data.id}/options`, {
        body: { value: "alpha", label: "Alpha", sortOrder: 0 },
      });

      const link = await call("POST", "/category-attributes", {
        body: {
          categoryId: created.category,
          attributeId: created.attribute,
          isRequired: false,
          isFilterable: true,
          createsVariant: true,
          sortOrder: 0,
        },
      });
      created.linked = link.status === 201 || link.status === 200;
    }

    const brand = await call("POST", "/brands", {
      body: { name: `${PREFIX}-brand`, isActive: true },
    });
    if (has(brand.data, "id")) created.brand = brand.data.id;

    // Now that sample records exist, re-run the read probes. On an empty
    // database the first pass had nothing to inspect.
    if (findings.some((f) => f.verdict === "UNKNOWN" && f.detail.includes("no sample"))) {
      console.log(`\n${C.cyan}re-probing shapes with the records just created${C.reset}`);
      await verifyCatalogReads();
      console.log("");
    }

    // --- product ----------------------------------------------------------
    // The headline unknown: the contract never states the status a new product
    // gets, and the admin list screen's caveat depends on the answer.
    const product = await call("POST", "/products", {
      body: {
        categoryId: created.category,
        name: `${PREFIX}-product`,
        type: created.linked ? "VARIABLE" : "SIMPLE",
        sellingUnit: "PIECE",
        minOrderQuantity: 1,
        ...(created.linked ? {} : { sku: `${PREFIX}-sku` }),
      },
    });

    record(
      "products",
      "POST /products returns the created record with an id",
      (product.status === 201 || product.status === 200) && has(product.data, "id")
        ? "MATCH"
        : "MISMATCH",
      `status ${product.status} · ${JSON.stringify(product.data)?.slice(0, 300)}`,
    );
    if (!has(product.data, "id")) return created;
    created.product = product.data.id;

    const fetched = await call("GET", `/products/${product.data.id}`);
    const status = fetched.data?.status;
    record(
      "products",
      "a new product starts as DRAFT",
      status === "DRAFT" ? "MATCH" : "MISMATCH",
      status === "DRAFT"
        ? "as assumed — the 'drafts are invisible in the list' caveat holds"
        : `actual status: ${status}. If new products are PUBLISHED, the admin list caveat and the post-create redirect need revisiting.`,
    );
    checkShape("products", "product detail shape", fetched.data, [
      "id",
      "categoryId",
      "brandId",
      "name",
      "slug",
      "type",
      "status",
      "sellingUnit",
      "minOrderQuantity",
      "attributeValues",
    ]);

    // --- variants ---------------------------------------------------------
    if (created.linked) {
      const variant = await call("POST", `/products/${created.product}/variants`, {
        body: {
          sku: `${PREFIX}-sku`,
          attributeValues: [{ attributeId: created.attribute, value: "alpha" }],
        },
      });
      record(
        "variants",
        "POST /products/:id/variants accepts an exact attribute set",
        variant.status === 201 || variant.status === 200 ? "MATCH" : "MISMATCH",
        `status ${variant.status} · ${JSON.stringify(variant.data)?.slice(0, 200)}`,
      );
    }

    const variants = await call("GET", `/products/${created.product}/variants`);
    checkShape("variants", "variant shape", variants.data?.[0], [
      "id",
      "sku",
      "status",
      "attributeValues",
    ]);
    if (variants.data?.[0]) {
      record(
        "variants",
        "the variants list embeds prices",
        has(variants.data[0], "prices") ? "MATCH" : "UNKNOWN",
        has(variants.data[0], "prices")
          ? "embedded — the product page shows them"
          : "not embedded — the product page already renders prices only when present, so it degrades cleanly",
      );
    }

    const variantId = variants.data?.[0]?.id;
    if (!variantId) return created;

    // --- prices -----------------------------------------------------------
    const price = await call("POST", `/variants/${variantId}/prices`, {
      body: { priceListKey: "retail", amount: 12.5 },
    });
    checkShape("prices", "price upsert response shape", price.data, [
      "variantId",
      "priceListKey",
      "amount",
    ]);

    // --- inventory --------------------------------------------------------
    const receipt = await call("POST", "/inventory/receive", {
      body: { variantId, quantity: 7, reason: `${PREFIX} probe` },
    });
    record(
      "inventory",
      "POST /inventory/receive succeeds without a warehouseId",
      receipt.status === 201 || receipt.status === 200 ? "MATCH" : "MISMATCH",
      `status ${receipt.status} · ${JSON.stringify(receipt.data)?.slice(0, 200)}`,
    );

    const levels = await call("GET", "/inventory", { query: { variantId } });
    checkShape("inventory", "level shape", levels.data?.[0], [
      "variantId",
      "warehouseId",
      "quantityOnHand",
      "quantityReserved",
    ]);

    const movements = await call("GET", "/inventory/movements", { query: { variantId } });
    checkShape("inventory", "movement shape", movements.data?.[0], [
      "id",
      "variantId",
      "warehouseId",
      "type",
      "quantity",
      "reason",
      "createdAt",
    ]);

    const adjustment = await call("POST", "/inventory/adjustments", {
      body: { variantId, quantityDelta: -2, reason: `${PREFIX} correction` },
    });
    record(
      "inventory",
      "POST /inventory/adjustments accepts a negative delta",
      adjustment.status === 201 || adjustment.status === 200 ? "MATCH" : "MISMATCH",
      `status ${adjustment.status}`,
    );
  } finally {
    await cleanup(created);
  }

  return created;
}

async function cleanup(created) {
  console.log(`\n${C.cyan}cleaning up${C.reset}`);

  const steps = [
    ["product", () => created.product && call("DELETE", `/products/${created.product}`)],
    [
      "category-attribute link",
      () =>
        created.linked &&
        call("DELETE", `/category-attributes/${created.category}/${created.attribute}`),
    ],
    ["attribute", () => created.attribute && call("DELETE", `/attributes/${created.attribute}`)],
    ["brand", () => created.brand && call("DELETE", `/brands/${created.brand}`)],
    ["category", () => created.category && call("DELETE", `/categories/${created.category}`)],
  ];

  for (const [label, run] of steps) {
    try {
      const result = await run();
      if (!result) continue;
      const ok = result.status === 204 || result.status === 200;
      console.log(
        `  ${ok ? C.green + "removed " : C.yellow + "left    "}${C.reset}${label}` +
          (ok
            ? ""
            : ` ${C.dim}(status ${result.status} — remove by hand, prefix ${PREFIX})${C.reset}`),
      );
    } catch (error) {
      console.log(`  ${C.yellow}left    ${C.reset}${label} ${C.dim}(${error.message})${C.reset}`);
    }
  }
}

// ---------------------------------------------------------------------------

console.log(`${C.cyan}verifying ${BASE}${C.reset}`);
console.log(
  `${C.dim}writes: ${WRITES ? "on" : "off (set VERIFY_WRITES=1 to enable)"}${C.reset}\n`,
);

try {
  await verifyAuth();
  await verifyUsers();
  await verifyCatalogReads();
  if (WRITES) {
    console.log(`\n${C.cyan}write probes${C.reset}`);
    await verifyWrites();
  } else {
    record(
      "writes",
      "create/update probes (product default status, response shapes, inventory)",
      "UNKNOWN",
      "skipped — rerun with VERIFY_WRITES=1 against a development database",
    );
  }
} catch (error) {
  console.error(`\n${C.red}aborted:${C.reset} ${error.message}`);
}

const mismatches = findings.filter((f) => f.verdict === "MISMATCH");
const unknowns = findings.filter((f) => f.verdict === "UNKNOWN");

console.log(
  `\n${C.cyan}summary${C.reset}  ` +
    `${C.green}${findings.length - mismatches.length - unknowns.length} match${C.reset} · ` +
    `${C.red}${mismatches.length} mismatch${C.reset} · ` +
    `${C.yellow}${unknowns.length} unknown${C.reset}`,
);

if (mismatches.length > 0) {
  console.log(`\n${C.red}mismatches to resolve with the backend team:${C.reset}`);
  for (const finding of mismatches) {
    console.log(`  · [${finding.area}] ${finding.assumption}`);
    if (finding.detail) console.log(`    ${C.dim}${finding.detail}${C.reset}`);
  }
}

process.exit(mismatches.length > 0 ? 1 : 0);
