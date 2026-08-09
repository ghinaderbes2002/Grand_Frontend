// Covers the staff-account module: listing, the role filter, role and status
// changes, and the guard on your own account.
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

const me = await call("GET", "/auth/me", undefined, at).then((r) => r.json());

// --- creating and listing --------------------------------------------------
const agent = await post(
  "/users",
  {
    email: "agent@store.local",
    password: "MinimumLength10Chars!",
    firstName: "سامر",
    lastName: "حداد",
    roleKey: "sales_agent",
  },
  at,
);

{
  const list = await body("/ar/admin/users");
  check("the list shows the new account", list.includes("agent@store.local"));
  check(
    "adding one goes through a dialog, not an always-open form",
    list.includes("<dialog") && list.includes("مستخدم جديد"),
  );
  check("it links to the detail page", list.includes(`/admin/users/${agent.id}`));
  check("the role is shown in Arabic", list.includes("مندوب مبيعات"));
  check("your own account is marked", list.includes("أنت"));

  const duplicate = await call(
    "POST",
    "/users",
    { email: "agent@store.local", password: "MinimumLength10Chars!", roleKey: "customer" },
    at,
  );
  check(
    "a duplicate email is rejected",
    duplicate.status === 409,
    `status ${duplicate.status}`,
  );

  const badRole = await call(
    "POST",
    "/users",
    { email: "x@store.local", password: "MinimumLength10Chars!", roleKey: "wizard" },
    at,
  );
  check("an unknown role is rejected", badRole.status === 404, `status ${badRole.status}`);
}

// --- the role filter -------------------------------------------------------
{
  const filtered = await body("/ar/admin/users?role=sales_agent");
  check(
    "filtering by role keeps the match",
    filtered.includes("agent@store.local"),
  );
  check(
    "filtering by role drops the rest",
    !filtered.includes("admin@printing-store.local"),
  );

  const bogus = await body("/ar/admin/users?role=wizard");
  check("an unknown role in the query is ignored", bogus.includes("admin@printing-store.local"));
}

// --- role and status -------------------------------------------------------
{
  const detail = await body(`/ar/admin/users/${agent.id}`);
  check("the role select is prefilled", detail.includes('value="sales_agent" selected'));
  check("the status select is offered", detail.includes('name="status"'));
  check(
    "the internal status is not offerable",
    !detail.includes('value="PENDING_VERIFICATION"'),
    "PATCH /users/:id/status refuses it",
  );

  const promoted = await call(
    "PATCH",
    `/users/${agent.id}/role`,
    { roleKey: "order_manager" },
    at,
  );
  check("changing the role works", promoted.status === 200, `status ${promoted.status}`);

  const afterRole = await body("/ar/admin/users");
  check("the new role shows in the list", afterRole.includes("مدير الطلبات"));

  const suspended = await call(
    "PATCH",
    `/users/${agent.id}/status`,
    { status: "SUSPENDED" },
    at,
  );
  check("suspending works", suspended.status === 200, `status ${suspended.status}`);

  const afterStatus = await body("/ar/admin/users");
  check("the suspended account is marked", afterStatus.includes("موقوف"));

  const internal = await call(
    "PATCH",
    `/users/${agent.id}/status`,
    { status: "PENDING_VERIFICATION" },
    at,
  );
  check(
    "the API refuses the internal status too",
    internal.status === 400,
    `status ${internal.status}`,
  );
}

// --- your own account ------------------------------------------------------
{
  const self = await body(`/ar/admin/users/${me.id}`);
  check(
    "your own account offers no role form",
    !self.includes('name="roleKey"'),
    "a self-demotion would lock the last admin out",
  );
  check("your own account offers no status form", !self.includes('name="status"'));
  check("it explains why", self.includes("لا يمكنك تغيير دورك"));
}

// --- permissions -----------------------------------------------------------
await post("/__role", { roleKey: "catalog_manager", permissions: ["products.read"] });
{
  const page = await body("/ar/admin/users");
  check("users need users.manage", page.includes("ليست لديك صلاحية"));

  const denied = await call("GET", "/users", undefined, at);
  check("the API refuses it too", denied.status === 403, `status ${denied.status}`);

  const products = await body("/ar/admin/products");
  check(
    "the nav hides the section for other roles",
    !products.includes(`/ar/admin/users"`),
  );
}

await post("/__role", { roleKey: "super_admin", permissions: [] });

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
