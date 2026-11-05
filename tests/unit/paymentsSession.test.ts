import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_SESSION_PATH } from "@/lib/nav-session";
import { paymentsSessionPreflight, paymentsSessionRoute, sessionCors, wantsPaymentsSessionCors } from "@/lib/payments-session";

/* The gateway's domain is off the session's allowlist; it may read, with the visitor's cookie, the
   nav's session and the signed-in public swap page's calls, and nothing else. */
const PAY = "https://payments.cosmospay.lat";

test("the nav's session is a GET the payments origin may read", () => {
  assert.equal(wantsPaymentsSessionCors("GET", NAV_SESSION_PATH, PAY, `${PAY}/`), true);
  assert.equal(wantsPaymentsSessionCors("get", NAV_SESSION_PATH, PAY, PAY), true);
  assert.equal(wantsPaymentsSessionCors("POST", NAV_SESSION_PATH, PAY, PAY), false);
  assert.equal(wantsPaymentsSessionCors("GET", `${NAV_SESSION_PATH}/x`, PAY, PAY), false);
});

test("a signed-in public swap's calls are allowed, by method and path", () => {
  const allowed: [string, string][] = [
    ["GET", "/api/organizations"],
    ["POST", "/api/swaps/quote"], ["POST", "/api/swaps"], ["GET", "/api/swaps/abc-123"], ["POST", "/api/swaps/abc-123/submit"],
    ["GET", "/api/cross-chain-swaps/assets"], ["POST", "/api/cross-chain-swaps/quote"], ["POST", "/api/cross-chain-swaps"],
    ["GET", "/api/cross-chain-swaps/abc"], ["POST", "/api/cross-chain-swaps/abc/deposit"],
    ["GET", "/api/usdt0/routes"], ["POST", "/api/usdt0/quote"], ["POST", "/api/usdt0/transfers"],
    ["GET", "/api/usdt0/transfers/abc"], ["POST", "/api/usdt0/transfers/abc/submit"],
  ];
  for (const [m, path] of allowed) assert.equal(paymentsSessionRoute(m, path), true, `${m} ${path}`);
});

test("nothing else of the session: no lists, keys, settings, members or auth", () => {
  const refused: [string, string][] = [
    ["GET", "/api/swaps"], ["GET", "/api/cross-chain-swaps"], ["GET", "/api/usdt0/transfers"],
    ["POST", "/api/organizations"], ["PATCH", "/api/organizations/org_1"], ["GET", "/api/organizations/org_1/members"],
    ["GET", "/api/api-keys"], ["POST", "/api/api-keys"], ["GET", "/api/auth/get-session"], ["POST", "/api/auth/sign-out"],
    ["DELETE", "/api/swaps/abc"], ["GET", "/api/swaps/abc/submit"], ["POST", "/api/swaps/abc/other"],
    ["GET", "/api/payment-intents"], ["GET", "/api/admin/swaps"], ["GET", "/api/swaps/a/b"],
  ];
  for (const [m, path] of refused) assert.equal(paymentsSessionRoute(m, path), false, `${m} ${path}`);
});

test("only from the payments origin", () => {
  assert.equal(wantsPaymentsSessionCors("POST", "/api/swaps/quote", PAY, PAY), true);
  assert.equal(wantsPaymentsSessionCors("POST", "/api/swaps/quote", "https://evil.example", PAY), false);
  assert.equal(wantsPaymentsSessionCors("POST", "/api/swaps/quote", "https://payments.cosmospay.lat.evil.example", PAY), false);
  assert.equal(wantsPaymentsSessionCors("POST", "/api/swaps/quote", null, PAY), false);
  assert.equal(wantsPaymentsSessionCors("POST", "/api/swaps/quote", PAY, "not a url"), false);
});

test("a preflight is answered for an allowed call with Content-Type only", () => {
  const ask = (path: string, method: string, headers = "content-type", origin = PAY) =>
    paymentsSessionPreflight(new Request(`https://dev.cosmospay.lat${path}`, { method: "OPTIONS", headers: { origin, "access-control-request-method": method, "access-control-request-headers": headers } }), path, PAY);
  const ok = ask("/api/swaps/quote", "POST");
  assert.ok(ok);
  assert.equal(ok.get("Access-Control-Allow-Origin"), PAY);
  assert.equal(ok.get("Access-Control-Allow-Credentials"), "true");
  assert.equal(ok.get("Access-Control-Allow-Methods"), "POST");
  assert.equal(ok.get("Access-Control-Allow-Headers"), "Content-Type");
  assert.ok(ask("/api/swaps/quote", "POST", ""));
  assert.equal(ask("/api/swaps/quote", "POST", "content-type, authorization"), null);
  assert.equal(ask("/api/api-keys", "POST"), null);
  assert.equal(ask("/api/swaps", "GET"), null);
  assert.equal(ask("/api/swaps/quote", "POST", "content-type", "https://evil.example"), null);
});

test("the allowance reflects the origin with credentials and keeps Vary", () => {
  const headers = new Headers({ Vary: "Cookie" });
  sessionCors(headers, PAY);
  assert.equal(headers.get("Access-Control-Allow-Origin"), PAY);
  assert.equal(headers.get("Access-Control-Allow-Credentials"), "true");
  assert.equal(headers.get("Vary"), "Cookie, Origin");
  sessionCors(headers, PAY);
  assert.equal(headers.get("Vary"), "Cookie, Origin");
});
