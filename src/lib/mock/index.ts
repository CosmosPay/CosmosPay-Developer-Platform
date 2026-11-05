/* Mock mode's API: every /api/* request the middleware does not let through is answered here,
   from the in-memory store, in the same envelopes the real routes answer. A path with no mock
   answers 404 with a message naming it, and the terminal logs it, so a missing mock is visible
   instead of a silent empty view. See src/lib/mock/mode.ts. */
import { matchPath, notFound, type MockRequest, type MockRoute } from "@/lib/mock/http";
import { mockOptions } from "@/lib/mock/mode";
import { MOCK_USER } from "@/lib/mock/session";
import { NAV_SESSION_PATH } from "@/lib/nav-session";
import { routes as platformRoutes } from "@/lib/mock/handlers/platform";
import { routes as paymentsRoutes } from "@/lib/mock/handlers/payments";
import { routes as swapsRoutes } from "@/lib/mock/handlers/swaps";
import { routes as fiatAdminRoutes } from "@/lib/mock/handlers/fiat-admin";
import { routes as p2pOnrampRoutes } from "@/lib/mock/handlers/p2p-onramp";

const ROUTES: MockRoute[] = [...platformRoutes, ...paymentsRoutes, ...swapsRoutes, ...p2pOnrampRoutes, ...fiatAdminRoutes];

/** Paths served by the real route even in mock mode (no database or upstream behind them;
 *  /api/nav-session reads the sample account the middleware set). */
const PASS_THROUGH = ["/api/openapi.json", NAV_SESSION_PATH];

export function mockHandles(pathname: string): boolean {
  return pathname.startsWith("/api/") && !PASS_THROUGH.includes(pathname);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const text = await request.text().catch(() => "");
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleMockApi(request: Request, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const options = mockOptions();
  // A route matches on the exact method; HEAD falls back to GET.
  const candidates = ROUTES.filter((r) => r.method === method || (method === "HEAD" && r.method === "GET"));
  let response: Response | null = null;
  for (const r of candidates) {
    const params = matchPath(r.path, url.pathname);
    if (!params) continue;
    const req: MockRequest = {
      method,
      url,
      params,
      body: await readBody(request),
      env: url.searchParams.get("env") === "prod" ? "prod" : "dev",
      org: url.searchParams.get("org"),
      user: MOCK_USER,
      options,
    };
    try {
      response = await r.handler(req);
    } catch (err) {
      console.error(`[mock] ${method} ${url.pathname} failed:`, err);
      response = new Response(JSON.stringify({ data: null, code: 500, status: "internal_error", message: "Mock handler failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    break;
  }
  if (!response) {
    console.warn(`[mock] no mock for ${method} ${url.pathname}`);
    response = notFound(`Mock mode: no mock for ${method} ${url.pathname}`);
  }
  if (options.latencyMs) await sleep(options.latencyMs);
  response.headers.set("X-Cosmos-Mock", "1");
  return response;
}
