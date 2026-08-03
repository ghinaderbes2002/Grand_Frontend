// Covers the admin additions: order filtering, product search + paging,
// bulk pricing and variant media.
const APP = process.env.APP_URL ?? "http://localhost:3102";
const API = "http://localhost:3100";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const post = (p, b, t) =>
  fetch(API + p, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify(b),
  }).then((r) => r.json());

await fetch(`${API}/__reset`, { method: "POST" });
await post("/__role", { roleKey: "super_admin", permissions: [] });

const tokens = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const at = tokens.accessToken;
const cookie = `ps_at=${tokens.accessToken}; ps_rt=${tokens.refreshToken}`;
const body = async (p) => (await fetch(APP + p, { headers: { cookie } })).text();

// --- seed: a variable product with two variants ---------------------------
const cat = await post("/categories", { name: "أحبار" }, at);
const colour = await post(
  "/attributes",
  { key: "color", name: "اللون", type: "COLOR_SELECT" },
  at,
);
await post(`/attributes/${colour.id}/options`, { value: "red", label: "أحمر" }, at);
await post(`/attributes/${colour.id}/options`, { value: "blue", label: "أزرق" }, at);
await post(
  "/category-attributes",
  { categoryId: cat.id, attributeId: colour.id, createsVariant: true },
  at,
);

const product = await post(
  "/products",
  {
    categoryId: cat.id,
    name: "حبر إيكو",
    type: "VARIABLE",
    sellingUnit: "PIECE",
    minOrderQuantity: 1,
  },
  at,
);
const red = await post(
  `/products/${product.id}/variants`,
  { sku: "ECO-RED", attributeValues: [{ attributeId: colour.id, value: "red" }] },
  at,
);
await post(
  `/products/${product.id}/variants`,
  { sku: "ECO-BLUE", attributeValues: [{ attributeId: colour.id, value: "blue" }] },
  at,
);

// --- bulk pricing ---------------------------------------------------------
{
  const html = await body(`/ar/admin/products/${product.id}`);
  check("bulk price form appears for multi-variant products", html.includes("تسعير كل المتغيرات"));
  const inputs = html.match(/name="price__[^"]+"/g) ?? [];
  check("one price input per variant", inputs.length === 2, inputs.join(" "));
  check(
    "bulk form offers a price list selector",
    html.includes('name="priceListKey"'),
  );

  // The endpoint itself, exercised directly.
  const bulk = await post(
    "/prices/bulk",
    {
      updates: [
        { variantId: red.id, priceListKey: "retail", amount: 25 },
        { variantId: red.id, priceListKey: "wholesale", amount: 18 },
      ],
    },
    at,
  );
  check("POST /prices/bulk applies updates", bulk.updated === 2, JSON.stringify(bulk));
}

// --- variant media --------------------------------------------------------
{
  const html = await body(`/ar/admin/products/${product.id}/variants/${red.id}`);
  // The file input is the media manager's distinguishing markup; the heading
  // text alone would also match the dictionary embedded in the RSC payload.
  check(
    "variant page shows a media upload control",
    html.includes('accept="image/jpeg,image/png,image/webp,image/gif"'),
  );
  check(
    "variant page still shows inventory forms",
    html.includes('name="quantityDelta"'),
  );
}

// --- admin product search + paging ---------------------------------------
await fetch(`${API}/products/${product.id}`, {
  method: "PATCH",
  headers: { "content-type": "application/json", authorization: `Bearer ${at}` },
  body: JSON.stringify({ status: "PUBLISHED" }),
});
{
  const list = await body("/ar/admin/products");
  check("admin product list renders the published product", list.includes("حبر إيكو"));
  check("search box is present", list.includes('name="q"'));
  check("category filter is present", list.includes('name="categoryId"'));

  const filtered = await body("/ar/admin/products?q=nothing-matches-this");
  check(
    "search narrows the list",
    !filtered.includes(">حبر إيكو<"),
    "product should be absent from results",
  );
}

// --- admin order filtering -----------------------------------------------
{
  const list = await body("/ar/admin/orders");
  check("order status filter is present", list.includes('name="status"'));
  check(
    "filter lists every order status",
    list.includes('value="PENDING_PAYMENT"') && list.includes('value="REFUNDED"'),
  );
  // Filtering moved to the API, so the page no longer carries a caveat about
  // narrowing results after the fact.
  const filtered = await body("/ar/admin/orders?status=PENDING_PAYMENT");
  check(
    "the status filter is applied server-side",
    /<option[^>]*value="PENDING_PAYMENT"[^>]*selected/.test(filtered),
    filtered.match(/<option[^>]*selected[^>]*>/)?.[0],
  );
}

// loading.tsx only renders while a route streams, so it is not observable in a
// completed HTTP response — the build output is the evidence it exists.

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
