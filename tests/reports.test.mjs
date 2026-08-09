// Covers the reports module: sales figures, low-stock alerts and stagnant
// products, plus the stock alert surfacing on the admin overview.
const APP = process.env.APP_URL ?? "http://localhost:3102";
const API = "http://localhost:3100";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const call = (method, p, b, t) =>
  fetch(API + p, {
    method,
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
const post = (p, b, t) => call("POST", p, b, t).then((r) => r.json());

await fetch(`${API}/__reset`, { method: "POST" });
await post("/__role", { roleKey: "super_admin", permissions: [] });

const tokens = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const at = tokens.accessToken;
const cookie = `ps_at=${tokens.accessToken}; ps_rt=${tokens.refreshToken}`;
const body = async (p) => (await fetch(APP + p, { headers: { cookie } })).text();

// --- seed: one well-stocked product, one nearly out ------------------------
const cat = await post("/categories", { name: "أحبار" }, at);

async function makeProduct(name, sku, price, stock) {
  const product = await post(
    "/products",
    {
      categoryId: cat.id,
      name,
      type: "SIMPLE",
      sellingUnit: "PIECE",
      minOrderQuantity: 1,
      sku,
    },
    at,
  );
  const db = await fetch(`${API}/__db`).then((r) => r.json());
  const variant = db.variants.find((v) => v.productId === product.id);
  await post(`/variants/${variant.id}/prices`, { priceListKey: "retail", amount: price }, at);
  if (stock > 0) {
    await post("/inventory/receive", { variantId: variant.id, quantity: stock }, at);
  }
  await call("PATCH", `/products/${product.id}`, { status: "PUBLISHED" }, at);
  return { product, variant };
}

const plenty = await makeProduct("حبر وفير", "INK-MANY", 20, 100);
// Seeded to fall under the low-stock threshold; referenced by SKU below.
await makeProduct("حبر نادر", "INK-FEW", 30, 3);

// --- low stock -------------------------------------------------------------
{
  const html = await body("/ar/admin/reports/low-stock");
  check("the scarce variant is listed", html.includes("INK-FEW"));
  check("the well-stocked one is not", !html.includes("INK-MANY"));
  check("the product name is shown alongside the SKU", html.includes("حبر نادر"));
  check("the warehouse is named, not a raw id", html.includes("MAIN"));

  // Raising the threshold should pull the other one in.
  const wide = await body("/ar/admin/reports/low-stock?threshold=200");
  check("raising the threshold widens the report", wide.includes("INK-MANY"));

  const narrow = await body("/ar/admin/reports/low-stock?threshold=0");
  check(
    "a threshold nothing falls under reports healthy stock",
    narrow.includes("المخزون بحالة جيدة"),
  );
}

// --- the overview surfaces it ---------------------------------------------
{
  const overview = await body("/ar/admin");
  check(
    "low stock appears on the overview as something needing attention",
    overview.includes("/ar/admin/reports/low-stock"),
  );
}

// --- sales -----------------------------------------------------------------
{
  const empty = await body("/ar/admin/reports");
  check("with no paid orders the report is empty", empty.includes("لا توجد مبيعات"));

  // An order left at PENDING_PAYMENT must not count as revenue.
  await post("/cart/items", { variantId: plenty.variant.id, quantity: 2 }, at);
  await post("/orders", { shippingAddress: { city: "عمّان", street: "ش" } }, at);

  const pending = await body("/ar/admin/reports");
  check(
    "a pending order is not counted as revenue",
    pending.includes("لا توجد مبيعات"),
    "only PAID and beyond count",
  );

  // Pay it, and it should appear.
  const db = await fetch(`${API}/__db`).then((r) => r.json());
  const order = db.orders[db.orders.length - 1];
  await post(`/orders/${order.id}/pay`, { simulateFailure: false }, at);

  // Assert on the rendered figures, not on the absence of a phrase — the RSC
  // payload carries the whole dictionary, so "no sales" is always in the HTML.
  const paid = await body("/ar/admin/reports");
  const stats = paid.match(/<dd[^>]*>[^<]*<\/dd>/g)?.join(" ") ?? "";
  check("a paid order shows up in revenue", stats.includes("40.00"), stats);
  check(
    "the order count is reported",
    /<dd[^>]*>1<\/dd>/.test(stats),
    "exactly one paid order",
  );
  check(
    "the by-day breakdown has a row",
    (paid.match(/<tbody[\s\S]*?<tr>/g)?.length ?? 0) > 0,
  );
}

// --- stagnant products -----------------------------------------------------
{
  const html = await body("/ar/admin/reports/stagnant");
  check(
    "a product nobody ordered is listed as stagnant",
    html.includes("حبر نادر"),
  );
  check(
    "a product that was just ordered is not",
    !html.includes(">حبر وفير<"),
  );
}

// --- permissions -----------------------------------------------------------
await post("/__role", { roleKey: "order_manager", permissions: ["orders.read"] });
{
  const html = await body("/ar/admin/reports");
  check("reports need reports.view", html.includes("ليست لديك صلاحية"));

  const lowStock = await body("/ar/admin/reports/low-stock");
  check("so does the low-stock screen", lowStock.includes("ليست لديك صلاحية"));

  const denied = await call("GET", "/reports/low-stock", undefined, at);
  check(
    "the API refuses the report without the permission",
    denied.status === 403,
    `status ${denied.status}`,
  );
}

await post("/__role", { roleKey: "super_admin", permissions: [] });

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
