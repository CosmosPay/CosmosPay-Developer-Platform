import { test } from "node:test";
import assert from "node:assert/strict";
import { navSessionBody } from "@/lib/nav-session";

test("the nav's session answer carries the public profile and nothing of the session", () => {
  const user = { id: "u1", name: "Ana", email: "ana@example.com", image: null, emailVerified: true, token: "secret", session: { token: "secret" } };
  const body = navSessionBody(user);
  assert.deepEqual(body, { user: { name: "Ana", email: "ana@example.com", image: null } });
  assert.equal(JSON.stringify(body).includes("secret"), false);
  assert.deepEqual(navSessionBody(null), { user: null });
  assert.deepEqual(navSessionBody(undefined), { user: null });
});
