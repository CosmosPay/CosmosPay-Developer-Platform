/* The mock API's routing and answers. A handler module exports `routes: MockRoute[]`; each route
   names a method and a path pattern (`/api/customers/:id`, `:rest*` for the remainder of a
   catch-all) and answers with a Response, or with a plain object that becomes the envelope every
   real route answers ({ data, code, status, message }). */
import { ApiStatus, jsonCreated, jsonError, jsonSuccess } from "@/lib/http";
import type { MockOptions } from "@/lib/mock/mode";

export type MockEnv = "dev" | "prod";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface MockRequest {
  method: string;
  url: URL;
  /** The path parameters of the matched pattern (already URI-decoded). */
  params: Record<string, string>;
  /** The JSON body, or null when there is none (or it is not JSON). */
  body: Record<string, unknown> | null;
  /** `?env=prod` is mainnet, anything else the sandbox. */
  env: MockEnv;
  /** `?org=`, when the dashboard tagged the call with the active organization. */
  org: string | null;
  user: MockUser;
  options: MockOptions;
}

export type MockHandler = (req: MockRequest) => Response | Promise<Response>;

export interface MockRoute {
  method: string;
  path: string;
  handler: MockHandler;
}

export function route(method: string, path: string, handler: MockHandler): MockRoute {
  return { method: method.toUpperCase(), path, handler };
}

/** The path parameters when `pattern` matches `pathname`, else null. */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const want = pattern.split("/").filter(Boolean);
  const got = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    const part = want[i];
    if (part.startsWith(":") && part.endsWith("*")) {
      const rest = got.slice(i);
      if (rest.length === 0) return null;
      params[part.slice(1, -1)] = rest.map(safeDecode).join("/");
      return params;
    }
    if (i >= got.length) return null;
    if (part.startsWith(":")) params[part.slice(1)] = safeDecode(got[i]);
    else if (part !== got[i]) return null;
  }
  return got.length === want.length ? params : null;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/* --- Answers, the same envelopes the real routes build --- */

export function ok(data: unknown, message = "Request completed successfully"): Response {
  return jsonSuccess({ data, message });
}

export function created(data: unknown, message = "Resource created successfully"): Response {
  return jsonCreated({ data, message });
}

export function badRequest(message = "Invalid request"): Response {
  return jsonError({ message, code: 400, status: ApiStatus.BAD_REQUEST });
}

export function forbidden(message = "You don't have permission to perform this action."): Response {
  return jsonError({ message, code: 403, status: ApiStatus.FORBIDDEN });
}

export function notFound(message = "Not found"): Response {
  return jsonError({ message, code: 404, status: ApiStatus.NOT_FOUND });
}

export function conflict(message: string): Response {
  return jsonError({ message, code: 409, status: ApiStatus.CONFLICT });
}

/** A JSON body as is, without the envelope (Better Auth's own endpoints answer like that). */
export function rawJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/* --- Reading a request --- */

export function str(body: Record<string, unknown> | null, key: string): string | undefined {
  const v = body?.[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;
}

export function intParam(url: URL, key: string, fallback: number, max = 100): number {
  const n = Math.trunc(Number(url.searchParams.get(key)));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

/** A page of `rows` as the Payments API answers its lists: `{ data, total, take, skip }`. */
export function page<T>(rows: T[], url: URL, defaultTake = 20): { data: T[]; total: number; take: number; skip: number } {
  const take = intParam(url, "take", defaultTake);
  const skip = Math.max(0, Math.trunc(Number(url.searchParams.get("skip"))) || 0);
  return { data: rows.slice(skip, skip + take), total: rows.length, take, skip };
}
