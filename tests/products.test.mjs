// Exercises the product / variant / price admin screens.
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
const get = (path) => fetch(APP + path, { headers: { cookie }, redirect: "manual" });
const body = async (path) => (await get(path)).text();

// --- seed: one simple category, one variable category ---------------------
const simpleCat = await post("/categories", { name: "ورق" }, at);
const variableCat = await post("/categories", { name: "أحبار" }, at);

const colour = await post(
  "/attributes",
  { key: "color", name: "اللون", type: "COLOR_SELECT", isFilterable: true },
  at,
);
await post(`/attributes/${colour.id}/options`, { value: "red", label: "أحمر" }, at);
await post(`/attributes/${colour.id}/options`, { value: "blue", label: "أزرق" }, at);

const gsm = await post(
  "/attributes",
  { key: "gsm", name: "الوزن الورقي", type: "INTEGER_UNIT", unit: "g/m²" },
  at,
);

// `gsm` is informational and required on the simple category.
await post(
  "/category-attributes",
  { categoryId: simpleCat.id, attributeId: gsm.id, isRequired: true, createsVariant: false },
  at,
);
// `color` creates variants on the variable category.
await post(
  "/category-attributes",
  { categoryId: variableCat.id, attributeId: colour.id, createsVariant: true },
  at,
);

const brand = await post("/brands", { name: "Roland" }, at);

// --- create form: type derivation and field shape -------------------------
{
  const step1 = await body(`/ar/admin/products/new`);
  check(
    "step one asks for a category",
    step1.includes('name="categoryId"') && step1.includes("ورق") && step1.includes("أحبار"),
  );

  const simpleForm = await body(`/ar/admin/products/new?categoryId=${simpleCat.id}`);
  check(
    "a category without variant attributes yields a SIMPLE product",
    simpleForm.includes("بسيط (متغيّر واحد)") &&
      simpleForm.includes("ما في صفات بتُنشئ متغيرات"),
  );
  check("SIMPLE form asks for a SKU up front", simpleForm.includes('name="sku"'));
  // React does not preserve JSX attribute order, so match the tag as a whole.
  const gsmInput = simpleForm.match(/<input[^>]*attr__[^>]*>/)?.[0] ?? "";
  check(
    "required informational attribute renders as a required number input",
    gsmInput.includes('type="number"') &&
      gsmInput.includes("required") &&
      simpleForm.includes("g/m²"),
    gsmInput,
  );

  const variableForm = await body(`/ar/admin/products/new?categoryId=${variableCat.id}`);
  check(
    "a category with variant attributes yields a VARIABLE product",
    variableForm.includes("متعدد المتغيرات") &&
      variableForm.includes("الصنف عنده صفات بتُنشئ متغيرات"),
  );
  check(
    "VARIABLE form does not ask for a SKU",
    !variableForm.includes('name="sku"'),
  );
  check(
    "variant-creating attributes stay off the product form",
    !variableForm.includes(`attr__${colour.id}`),
  );
  check("brand picker is offered", variableForm.includes(brand.id));
}

// --- simple product -------------------------------------------------------
const simpleProduct = await post(
  "/products",
  {
    categoryId: simpleCat.id,
    name: "ورق A4",
    type: "SIMPLE",
    sellingUnit: "SHEET",
    minOrderQuantity: 100,
    sku: "A4-100",
    attributeValues: [{ attributeId: gsm.id, value: "80" }],
  },
  at,
);
{
  const detail = await body(`/ar/admin/products/${simpleProduct.id}`);
  check("simple product detail renders", detail.includes("ورق A4"), simpleProduct.id);
  check("its implicit variant is listed", detail.includes("A4-100"));
  check(
    "simple products explain that variants cannot be added",
    detail.includes("متغيّر واحد ضمني"),
  );
  check("draft status is shown", detail.includes("مسودة"));
  check("existing attribute value is prefilled", /value="80"/.test(detail));
}

// --- variable product + variants + prices ---------------------------------
const variableProduct = await post(
  "/products",
  {
    categoryId: variableCat.id,
    name: "حبر إيكو",
    type: "VARIABLE",
    sellingUnit: "PIECE",
    minOrderQuantity: 1,
  },
  at,
);
const redVariant = await post(
  `/products/${variableProduct.id}/variants`,
  { sku: "ECO-RED", attributeValues: [{ attributeId: colour.id, value: "red" }] },
  at,
);
await post(`/variants/${redVariant.id}/prices`, { priceListKey: "retail", amount: 25 }, at);
{
  const detail = await body(`/ar/admin/products/${variableProduct.id}`);
  check("variable product lists its variant", detail.includes("ECO-RED"));
  check("variant attribute value is shown", detail.includes("أحمر") || detail.includes("red"));
  check("variant price is shown", detail.includes("retail") && detail.includes("25"));

  const variantForm =
    detail.match(/<select[^>]*name="attr__[^"]*"[\s\S]*?<\/select>/)?.[0] ?? "";
  check(
    "variant form offers the attribute's option values",
    variantForm.includes('value="red"') && variantForm.includes('value="blue"'),
    variantForm.match(/<option[^>]*>/g)?.join(" "),
  );
  check("price form is present", detail.includes('name="priceListKey"'));
}

// --- listing --------------------------------------------------------------
{
  const list = await body("/ar/admin/products");
  check(
    "draft products are absent from the published-only list",
    !list.includes("ورق A4") && !list.includes("حبر إيكو"),
  );
  check("the listing caveat is shown", list.includes("بيرجّع المنشور فقط"));

  await fetch(`${API}/products/${variableProduct.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${at}` },
    body: JSON.stringify({ status: "PUBLISHED" }),
  });

  const published = await body("/ar/admin/products");
  check("a published product appears with its price", published.includes("حبر إيكو") &&
    published.includes("25"));
}

// --- permissions ----------------------------------------------------------
await post("/__role", { roleKey: "catalog_manager", permissions: ["categories.create"] });
{
  const list = await body("/ar/admin/products");
  check("products need products.read", list.includes("ما عندك صلاحية"));
}
await post("/__role", { roleKey: "catalog_manager", permissions: ["products.read"] });
{
  const detail = await body(`/ar/admin/products/${simpleProduct.id}`);
  check("products.read alone still renders the detail", detail.includes("ورق A4"));

  // Check rendered buttons, not raw HTML: the RSC payload carries the whole
  // dictionary, so every label string appears in the source either way.
  const buttons = detail.match(/<button[^>]*>[^<]*</g)?.join("\n") ?? "";
  check(
    "products.read alone hides the delete and save controls",
    !buttons.includes("حذف") && !buttons.includes("حفظ التعديلات"),
    buttons.match(/>[^<]+</g)?.join(" | "),
  );
  check(
    "products.read alone gets a read-only summary instead of the form",
    !detail.includes('name="sellingUnit"') && detail.includes("لوح"),
  );
}

await post("/__role", { roleKey: "super_admin", permissions: [] });
{
  const missing = await get(`/ar/admin/products/${crypto.randomUUID()}`);
  check("a missing product 404s", missing.status === 404, `status ${missing.status}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
