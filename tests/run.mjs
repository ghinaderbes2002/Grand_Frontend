/**
 * Runs the end-to-end suites against a mock backend.
 *
 * Boots `tests/mock-api.mjs` on 3100 and the production build on 3102 pointed
 * at it, runs each suite, then tears both down.
 *
 *   npm run build && npm test
 *
 * These suites verify **this frontend's behaviour** — routing, permission
 * gating, form shapes, i18n, the token-refresh logic. They do not verify the
 * real backend: the mock encodes our reading of API_CONTRACT.md, so a
 * misreading would be mirrored in both. Use `npm run verify:contract` against a
 * live server for that.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const MOCK_PORT = 3100;
const APP_PORT = 3102;

const SUITES = [
  "auth-flow.test.mjs",
  "catalog.test.mjs",
  "products.test.mjs",
  "inventory.test.mjs",
  "admin-extras.test.mjs",
  "shop.test.mjs",
  "customer-role.test.mjs",
  "caching.test.mjs",
  "reports.test.mjs",
  "coupons.test.mjs",
  "warehouses.test.mjs",
  "users.test.mjs",
];

const children = [];

/**
 * Spawned without `shell`: on Windows `process.execPath` contains spaces, and
 * shell mode would split it at the first one.
 */
function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["ignore", "ignore", "inherit"],
    ...options,
  });
  children.push(child);
  return child;
}

/**
 * Next's CLI entrypoint, run through node directly. Going via `npx` would mean
 * spawning a `.cmd` shim on Windows, which modern Node refuses without a shell.
 */
const NEXT_BIN = join(here, "..", "node_modules", "next", "dist", "bin", "next");

async function waitFor(url, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`${label} did not come up within ${timeoutMs}ms`);
}

function run(suite) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, suite)], {
      stdio: "inherit",
      env: { ...process.env, APP_URL: `http://localhost:${APP_PORT}` },
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

let failed = 0;
/** Named so a non-zero exit points at the suite instead of just a count. */
const failures = [];

try {
  start(process.execPath, [join(here, "mock-api.mjs")]);
  await waitFor(`http://localhost:${MOCK_PORT}/__log`, "mock API");

  start(process.execPath, [NEXT_BIN, "start", "-p", String(APP_PORT)], {
    cwd: join(here, ".."),
    env: {
      ...process.env,
      API_BASE_URL: `http://localhost:${MOCK_PORT}`,
      // Suites seed straight through the mock's REST API, bypassing the Server
      // Actions that invalidate cache tags. Caching public catalog reads would
      // therefore serve stale data within a run — something production never
      // does, since every write this app makes goes through those actions.
      CACHE_TTL_SCALE: "0",
    },
  });
  await waitFor(`http://localhost:${APP_PORT}/ar`, "Next server");

  for (const suite of SUITES) {
    console.log(`\n[36m── ${suite}[0m`);
    const code = await run(suite);
    if (code !== 0) {
      failures.push(`${suite} (exit ${code})`);
      failed += 1;
    }
  }
} catch (error) {
  console.error(`\n[31m${error.message}[0m`);
  // `npm test` builds first. This path is for `test:only`, which reuses the
  // last build on purpose — and will happily test code you have since edited.
  console.error("No build found? Run `npm test` (it builds) instead of `test:only`.");
  failed += 1;
} finally {
  shutdown();
}

console.log(
  failed === 0
    ? "\n[32mall suites passed[0m"
    : `\n[31m${failed} suite(s) failed:[0m ${failures.join(", ") || "setup"}`,
);
process.exit(failed === 0 ? 0 : 1);
