// Exercises the proxy's refresh path against the mock backend.
const APP = process.env.APP_URL ?? "http://localhost:3102";
const API = "http://localhost:3100";

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const mockLog = async () => (await fetch(`${API}/__log`)).json();
const cookie = (at, rt) => `ps_at=${at}; ps_rt=${rt}`;
const cleared = (c) => c.includes("Max-Age=0") || c.includes("Expires=Thu, 01 Jan 1970");

async function login(ttl) {
  const res = await fetch(`${API}/auth/login?ttl=${ttl}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "admin@printing-store.local",
      password: "ChangeMe123!",
    }),
  });
  return res.json();
}

const expiredAccessToken = (() => {
  const seg = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${seg({ alg: "HS256" })}.${seg({ sub: "x", exp: Math.floor(Date.now() / 1000) - 10 })}.sig`;
})();

// --- A. A comfortably fresh token must not trigger a refresh at all ---------
{
  const t = await login(600);
  const mark = (await mockLog()).length;

  const res = await fetch(`${APP}/ar/account`, {
    headers: { cookie: cookie(t.accessToken, t.refreshToken) },
    redirect: "manual",
  });
  const body = await res.text();
  const log = (await mockLog()).slice(mark);

  check(
    "protected page renders with a valid session",
    res.status === 200 && body.includes("super_admin"),
    `status ${res.status}`,
  );
  check("no refresh while the access token is fresh", !log.includes("POST /auth/refresh"));

  // Guest-only routes bounce a logged-in visitor.
  const guest = await fetch(`${APP}/ar/login`, {
    headers: { cookie: cookie(t.accessToken, t.refreshToken) },
    redirect: "manual",
  });
  check(
    "logged-in users are redirected away from /login",
    guest.status === 307 && guest.headers.get("location")?.endsWith("/ar"),
    `${guest.status} -> ${guest.headers.get("location")}`,
  );
}

// --- B. Expired access token + live refresh token: exactly one refresh ------
{
  const t = await login(600); // only the refresh token is used here
  const mark = (await mockLog()).length;

  const parallel = await Promise.all(
    Array.from({ length: 8 }, () =>
      fetch(`${APP}/ar/account`, {
        headers: { cookie: cookie(expiredAccessToken, t.refreshToken) },
        redirect: "manual",
      }),
    ),
  );

  const log = (await mockLog()).slice(mark);
  const refreshCalls = log.filter((l) => l === "POST /auth/refresh").length;

  check(
    "8 parallel requests collapse into exactly 1 refresh",
    refreshCalls === 1,
    `${refreshCalls} refresh call(s)`,
  );
  check("backend never saw refresh-token reuse", !log.some((l) => l.includes("REUSE")));
  check(
    "backend never received an expired access token",
    !log.some((l) => l.includes("EXPIRED access token")),
  );
  check(
    "all 8 requests rendered the account page",
    parallel.every((r) => r.status === 200),
    parallel.map((r) => r.status).join(","),
  );

  const setCookie = parallel[0].headers.getSetCookie();
  const at = setCookie.find((c) => c.startsWith("ps_at="));
  const rt = setCookie.find((c) => c.startsWith("ps_rt="));
  check("rotated tokens are written back as cookies", Boolean(at && rt));
  check(
    "session cookies are HttpOnly",
    Boolean(at?.includes("HttpOnly") && rt?.includes("HttpOnly")),
    at?.split(";").slice(1).join(";").trim(),
  );
  check("the refresh cookie actually rotated", !rt?.includes(t.refreshToken));

  // A straggler request still carrying the pre-refresh cookie (the browser has
  // not applied Set-Cookie yet) must be served from the grace window, not sent
  // to the backend as a replay.
  const replayMark = (await mockLog()).length;
  const replay = await fetch(`${APP}/ar/account`, {
    headers: { cookie: cookie(expiredAccessToken, t.refreshToken) },
    redirect: "manual",
  });
  const replayLog = (await mockLog()).slice(replayMark);
  check(
    "a straggler with the old cookie is served, not logged out",
    replay.status === 200 && !replayLog.includes("POST /auth/refresh"),
    `${replay.status}, backend reuse-detect: ${replayLog.some((l) => l.includes("REUSE"))}`,
  );
}

// --- C. A dead session is cleaned up, not retried forever -------------------
{
  const res = await fetch(`${APP}/ar/account`, {
    headers: { cookie: cookie(expiredAccessToken, "not-a-real-refresh-token") },
    redirect: "manual",
  });
  const cookies = res.headers.getSetCookie();

  check(
    "an invalid session redirects to login",
    res.status === 307 && (res.headers.get("location") ?? "").includes("/ar/login"),
    `${res.status} -> ${res.headers.get("location")}`,
  );
  check(
    "an invalid session clears both cookies",
    cookies.filter((c) => c.startsWith("ps_")).every(cleared) &&
      cookies.filter((c) => c.startsWith("ps_")).length === 2,
    cookies.join(" | "),
  );
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
