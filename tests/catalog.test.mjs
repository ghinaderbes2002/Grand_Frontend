// Drives the admin panel over HTTP against the mock catalog backend.
const APP = process.env.APP_URL ?? "http://localhost:3102";
const API = "http://localhost:3100";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const json = (r) => r.json();
const post = (path, body, token) =>
  fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).then(json);

async function setRole(roleKey, permissions) {
  await post("/__role", { roleKey, permissions });
}

// --- seed -----------------------------------------------------------------
// The mock keeps state in memory, so start from a clean slate each run.
await fetch(`${API}/__reset`, { method: "POST" });

const tokens = await post("/auth/login", {
  email: "admin@printing-store.local",
  password: "ChangeMe123!",
});
const at = tokens.accessToken;

const parent = await post("/categories", { name: "مواد الطباعة", isActive: true }, at);
const child = await post(
  "/categories",
  { name: "ورق ترانسفير", parentId: parent.id, isActive: true },
  at,
);
const colour = await post(
  "/attributes",
  { key: "color", name: "اللون", type: "COLOR_SELECT", isFilterable: true },
  at,
);
await post(`/attributes/${colour.id}/options`, { value: "red", label: "أحمر" }, at);
const size = await post(
  "/attributes",
  { key: "sheet_size", name: "المقاس", type: "TEXT", isFilterable: false },
  at,
);
await post(
  "/category-attributes",
  { categoryId: child.id, attributeId: colour.id, createsVariant: true, isRequired: true },
  at,
);
// Seeded so the brand list has something to render; the id is not needed here.
await post("/brands", { name: "Roland", isActive: true }, at);

const cookie = `ps_at=${tokens.accessToken}; ps_rt=${tokens.refreshToken}`;
const get = (path, opts = {}) =>
  fetch(`${APP}${path}`, { headers: { cookie }, redirect: "manual", ...opts });
const body = async (path) => (await get(path)).text();

// --- anonymous ------------------------------------------------------------
{
  const res = await fetch(`${APP}/ar/admin`, { redirect: "manual" });
  check(
    "anonymous visitors are redirected off /admin",
    res.status === 307 && (res.headers.get("location") ?? "").includes("/ar/login"),
    `${res.status} -> ${res.headers.get("location")}`,
  );
}

// --- super_admin ----------------------------------------------------------
await setRole("super_admin", []);
{
  const html = await body("/ar/admin");
  check(
    "overview lists every section for super_admin",
    html.includes("الأصناف") && html.includes("الصفات") && html.includes("العلامات التجارية"),
  );

  const categories = await body("/ar/admin/categories");
  check(
    "category tree shows parent and child",
    categories.includes("مواد الطباعة") && categories.includes("ورق ترانسفير"),
  );
  check(
    "child category is indented",
    /padding-inline-start:\s*36px/.test(categories),
    categories.match(/padding-inline-start:[^;"]*/g)?.join(" | "),
  );

  const detail = await body(`/ar/admin/categories/${child.id}`);
  check("category detail shows the linked attribute", detail.includes("اللون"));
  check(
    "variant-creating link is badged",
    detail.includes("تُنشئ متغيرات") && detail.includes("إلزامية"),
  );
  // Assert against the rendered <select>, not the raw HTML: the RSC payload
  // embeds the whole dictionary, so plain substring checks match everything.
  const picker = detail.match(/<select[^>]*name="attributeId"[\s\S]*?<\/select>/)?.[0] ?? "";
  check(
    "already-linked attributes drop out of the link picker",
    picker.includes("sheet_size") && !picker.includes("(color)"),
    picker.match(/<option[^>]*>([^<]*)</g)?.join(" | "),
  );
  // The breadcrumb is built from parent names, not from `Category.path` — the
  // live backend fills that with ids, and rendering it showed raw UUIDs.
  check(
    "the category breadcrumb reads as names",
    detail.includes("مواد الطباعة › ورق ترانسفير"),
  );
  // `path` still ships inside the RSC payload because the form receives the
  // whole category, so a substring check would always match. The parent picker
  // is where a customer would actually see it.
  const parents = detail.match(/<select[^>]*name="parentId"[\s\S]*?<\/select>/)?.[0] ?? "";
  // Only the option *text* — `<option value="…">` carries the id by design.
  const parentLabels = [...parents.matchAll(/<option[^>]*>([^<]*)</g)]
    .map((match) => match[1])
    .join(" | ");
  check(
    "the parent picker lists names, not id paths",
    parentLabels.includes("مواد الطباعة") &&
      !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(parentLabels),
    parentLabels,
  );

  const attribute = await body(`/ar/admin/attributes/${colour.id}`);
  check(
    "attribute options are listed",
    attribute.includes("أحمر") && attribute.includes("red"),
  );
  check(
    "immutable fields are disabled on edit",
    /name="key"[^>]*disabled|disabled[^>]*name="key"/.test(attribute),
  );

  const textAttribute = await body(`/ar/admin/attributes/${size.id}`);
  check(
    "non-select attributes explain why they have no options",
    textAttribute.includes("SELECT و COLOR_SELECT"),
  );

  const brands = await body("/ar/admin/brands");
  check("brand list renders", brands.includes("Roland"));

  const missing = await get(`/ar/admin/categories/${crypto.randomUUID()}`);
  check("a missing category 404s", missing.status === 404, `status ${missing.status}`);
}

// --- scoped role ----------------------------------------------------------
await setRole("catalog_manager", ["categories.create", "categories.update"]);
{
  const overview = await body("/ar/admin");
  check(
    "overview hides sections the role cannot use",
    overview.includes('href="/ar/admin/categories"') &&
      !overview.includes('href="/ar/admin/brands"'),
  );

  const categories = await get("/ar/admin/categories");
  check("permitted section still renders", categories.status === 200);

  const brands = await body("/ar/admin/brands");
  check("forbidden section shows the no-access screen", brands.includes("ما عندك صلاحية"));
}

// --- no permissions -------------------------------------------------------
await setRole("customer", []);
{
  const html = await body("/ar/admin");
  check("a customer gets the no-access screen", html.includes("ما عندك صلاحية"));
}

// --- locale ---------------------------------------------------------------
await setRole("super_admin", []);
{
  const html = await body("/en/admin/categories");
  check(
    "English locale renders English labels",
    html.includes("New category") && html.includes("Parent category"),
  );
  const rtl = await body("/ar/admin/categories");
  check("Arabic stays RTL", rtl.includes('dir="rtl"') && html.includes('dir="ltr"'));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
