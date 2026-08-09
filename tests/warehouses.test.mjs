// Covers warehouse editing and the customer price-list assignment.
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

const warehouses = await call("GET", "/warehouses", undefined, at).then((r) => r.json());
const main = warehouses[0];

// --- editing ---------------------------------------------------------------
{
  const list = await body("/ar/admin/warehouses");
  check("the list links to each warehouse", list.includes(`/warehouses/${main.id}`));

  const detail = await body(`/ar/admin/warehouses/${main.id}`);
  check("the edit form is prefilled", detail.includes('value="MAIN"'));

  const codeField = detail.match(/<input[^>]*name="code"[^>]*>/)?.[0] ?? "";
  check(
    "the code cannot be changed after creation",
    codeField.includes("disabled"),
    codeField.slice(0, 120),
  );
  check("the page explains there is no delete", detail.includes("لا يمكن حذف المستودعات"));

  const renamed = await call(
    "PATCH",
    `/warehouses/${main.id}`,
    { name: "المستودع المركزي" },
    at,
  );
  check("renaming works", renamed.status === 200, `status ${renamed.status}`);

  const afterRename = await body("/ar/admin/warehouses");
  check("the new name shows in the list", afterRename.includes("المستودع المركزي"));
}

// --- the last active warehouse is protected --------------------------------
{
  const refused = await call("PATCH", `/warehouses/${main.id}`, { isActive: false }, at);
  check(
    "disabling the only active warehouse is refused",
    refused.status === 409,
    `status ${refused.status} — orders need a default warehouse`,
  );

  // With a second one, disabling the first becomes allowed.
  const second = await post(
    "/warehouses",
    { code: "IRBID", name: "فرع إربد", isActive: true },
    at,
  );
  const allowed = await call("PATCH", `/warehouses/${main.id}`, { isActive: false }, at);
  check(
    "with a spare active warehouse it is allowed",
    allowed.status === 200,
    `status ${allowed.status}`,
  );

  const list = await body("/ar/admin/warehouses");
  check("the disabled one is marked inactive", list.includes("غير فعّال"));

  // Put it back so the rest of the run is unaffected.
  await call("PATCH", `/warehouses/${main.id}`, { isActive: true }, at);
  await call("PATCH", `/warehouses/${second.id}`, { isActive: false }, at);
}

// --- customer price lists --------------------------------------------------
{
  const page = await body("/ar/admin/customers");
  check("the form asks for a customer id", page.includes('name="customerId"'));
  check("wholesale is offered", page.includes('value="wholesale"'));
  check(
    "the missing customer directory is called out",
    page.includes("لا يوفّر النظام مسارًا يُرجع قائمة العملاء"),
  );

  const assigned = await call(
    "PATCH",
    `/customers/${crypto.randomUUID()}/price-list`,
    { priceListKey: "wholesale" },
    at,
  );
  check("assigning a price list works", assigned.status === 200, `status ${assigned.status}`);
}

// --- permissions -----------------------------------------------------------
await post("/__role", { roleKey: "catalog_manager", permissions: ["products.read"] });
{
  const warehouses = await body("/ar/admin/warehouses");
  check("warehouses need warehouses.manage", warehouses.includes("ليست لديك صلاحية"));

  const customers = await body("/ar/admin/customers");
  check("price lists need prices.update", customers.includes("ليست لديك صلاحية"));

  const denied = await call(
    "PATCH",
    `/customers/${crypto.randomUUID()}/price-list`,
    { priceListKey: "wholesale" },
    at,
  );
  check("the API refuses it too", denied.status === 403, `status ${denied.status}`);
}

await post("/__role", { roleKey: "super_admin", permissions: [] });

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
