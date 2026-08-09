// Runs the customer journey as an actual `customer` role — permissions `[]` —
// against a mock that enforces the contract's stated permissions.
//
// Every other suite authenticates as the seed super_admin, which passes every
// permission check and therefore proves nothing about what a real shopper can
// do. This one exists to catch exactly that gap.
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

const admin = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const at = admin.accessToken;

// --- seed a sellable product (as admin, before dropping privileges) --------
const cat = await post("/categories", { name: "أحبار" }, at);
const ink = await post(
  "/products",
  {
    categoryId: cat.id,
    name: "حبر إيكو",
    type: "SIMPLE",
    sellingUnit: "PIECE",
    minOrderQuantity: 1,
    sku: "ECO-1",
  },
  at,
);
const variant = (await fetch(`${API}/__db`).then((r) => r.json())).variants.find(
  (v) => v.productId === ink.id,
);
await post(`/variants/${variant.id}/prices`, { priceListKey: "retail", amount: 20 }, at);
await post("/inventory/receive", { variantId: variant.id, quantity: 50 }, at);
await call("PATCH", `/products/${ink.id}`, { status: "PUBLISHED" }, at);

await post("/cart/items", { variantId: variant.id, quantity: 2 }, at);
const order = await post(
  "/orders",
  { shippingAddress: { city: "عمّان", street: "شارع المدينة" } },
  at,
);

// --- drop to a plain customer ---------------------------------------------
await post("/__role", { roleKey: "customer", permissions: [] });

const tokens = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const cookie = `ps_at=${tokens.accessToken}; ps_rt=${tokens.refreshToken}`;
const customerToken = tokens.accessToken;

const get = (p) => fetch(APP + p, { headers: { cookie }, redirect: "manual" });
const body = async (p) => (await get(p)).text();

// --- what a customer must be able to do ------------------------------------
{
  const shop = await get("/ar/shop");
  check("customer can browse the shop", shop.status === 200);

  const product = await get(`/ar/shop/${ink.slug}`);
  check("customer can open a product", product.status === 200);

  const cart = await get("/ar/cart");
  check("customer can open the cart", cart.status === 200, `status ${cart.status}`);

  const addToCart = await call(
    "POST",
    "/cart/items",
    { variantId: variant.id, quantity: 1 },
    customerToken,
  );
  check(
    "customer can add to the cart",
    addToCart.status === 200 || addToCart.status === 201,
    `status ${addToCart.status}`,
  );

  const placeOrder = await call(
    "POST",
    "/orders",
    { shippingAddress: { city: "عمّان", street: "شارع المدينة" } },
    customerToken,
  );
  check("customer can place an order", placeOrder.status === 201, `status ${placeOrder.status}`);

  const orders = await get("/ar/orders");
  check("customer can see their orders", orders.status === 200);

  const detail = await get(`/ar/orders/${order.id}`);
  check("customer can open their order", detail.status === 200, `status ${detail.status}`);

  const pay = await call("POST", `/orders/${order.id}/pay`, { simulateFailure: false }, customerToken);
  check(
    "customer can pay for their own order",
    pay.status === 200 || pay.status === 201,
    `status ${pay.status} — the contract grants this to the order owner explicitly`,
  );
}

// --- cancellation: the owner may, but only to cancel -----------------------
{
  const detail = await body(`/ar/orders/${order.id}`);
  const buttons = detail.match(/<button[^>]*>[^<]*</g)?.join("\n") ?? "";
  check(
    "the UI offers cancelling to the order's owner",
    buttons.includes("إلغاء الطلب"),
  );

  // Any other target status is the admin's to make, and 403s for the owner.
  const promote = await call(
    "PATCH",
    `/orders/${order.id}/status`,
    { status: "CONFIRMED" },
    customerToken,
  );
  check(
    "the owner cannot drive any other transition",
    promote.status === 403,
    `status ${promote.status}`,
  );

  const cancel = await call(
    "PATCH",
    `/orders/${order.id}/status`,
    { status: "CANCELLED" },
    customerToken,
  );
  check(
    "the owner can cancel their own order without any permission",
    cancel.status === 200,
    `status ${cancel.status}`,
  );
}

// --- what a customer must not reach ----------------------------------------
{
  const admin = await get("/ar/admin");
  check("customer gets no-access on the admin overview", (await body("/ar/admin")).includes("ليست لديك صلاحية"), `status ${admin.status}`);

  const products = await body("/ar/admin/products");
  check("customer cannot read the admin product list", products.includes("ليست لديك صلاحية"));

  const orders = await body("/ar/admin/orders");
  check("customer cannot read all orders", orders.includes("ليست لديك صلاحية"));

  const createCategory = await call("POST", "/categories", { name: "x" }, customerToken);
  check(
    "the API refuses catalog writes from a customer",
    createCategory.status === 403,
    `status ${createCategory.status}`,
  );

  const stock = await call("GET", `/inventory?variantId=${variant.id}`, undefined, customerToken);
  check(
    "the API refuses inventory reads from a customer",
    stock.status === 403,
    `status ${stock.status} — this is why the storefront cannot show availability`,
  );

  const shipments = await call("GET", `/orders/${order.id}/shipments`, undefined, customerToken);
  check(
    "the API refuses shipment reads from a customer",
    shipments.status === 403 || shipments.status === 404,
    `status ${shipments.status} — this is why tracking cannot be shown`,
  );
}

await post("/__role", { roleKey: "super_admin", permissions: [] });

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
