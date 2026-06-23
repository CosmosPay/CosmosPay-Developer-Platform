/* api-client.ts — thin browser client for the same-origin developer API.
   Every endpoint returns the ApiEnvelope { data, code, status, message }; these
   helpers unwrap `data` and throw an Error (with the server message) on failure. */
async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* empty / non-JSON body */ }
  if (!res.ok) {
    const msg = (json && json.message) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = json && json.code;
    throw err;
  }
  return json ? json.data : null;
}

/* API keys CRUD — see src/pages/api/api-keys.
   create body: { environment: 'dev'|'prod', permissions: string[] (>=1), role: 'user'|'admin' }
   create → { username, apiKey (secret, shown once), id, createdAt, updatedAt, permissions, role }
   list   → [{ id, createdAt, updatedAt, permissions, role }] (no secret) */
export const apiKeys = {
  list: (orgId) => request(orgId ? `/api/api-keys?org=${encodeURIComponent(orgId)}` : "/api/api-keys"),
  create: (body) => request("/api/api-keys", { method: "POST", body: JSON.stringify(body) }),
  remove: (id) => request(`/api/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" }),
  update: (id, body) => request(`/api/api-keys/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
};

/* Payment intents (Stellar SEP-7 links) — proxied to the Cosmos Payments API,
   scoped to the signed-in user's consumer. `env` is 'dev' (testnet) or 'prod' (public).
   create body: { org, environment, kind: 'pay'|'tx', destination, amount?, assetCode?,
   assetIssuer?, source? (tx only), memo?, msg?, callback? }
   create/get → a PaymentIntent { id, kind, status, network, destination, amount, asset,
   memo, uri (SEP-7 deep link), qr (PNG data URL), xdr (tx only), createdAt, ... } */
export const paymentIntents = {
  list: (env, query = {}) => {
    const qs = new URLSearchParams({ env: env || "dev" });
    if (query.org) qs.set("org", query.org);
    if (query.status) qs.set("status", query.status);
    if (query.take) qs.set("take", String(query.take));
    if (query.skip) qs.set("skip", String(query.skip));
    return request(`/api/payment-intents?${qs.toString()}`);
  },
  create: (body) => request("/api/payment-intents", { method: "POST", body: JSON.stringify(body) }),
  get: (id, env) => request(`/api/payment-intents/${encodeURIComponent(id)}?env=${env || "dev"}`),
  update: (id, env, body) => request(`/api/payment-intents/${encodeURIComponent(id)}?env=${env || "dev"}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id, env) => request(`/api/payment-intents/${encodeURIComponent(id)}?env=${env || "dev"}`, { method: "DELETE" }),
  validate: (id, env, txHash) => request(`/api/payment-intents/${encodeURIComponent(id)}/validate?env=${env || "dev"}`, { method: "POST", body: JSON.stringify({ txHash }) }),
};

/* Webhook endpoints — proxied to the Cosmos Payments API (per-user consumer).
   `env` is 'dev'|'prod'; mutations pass the active `org` so the platform can
   enforce the workspace's webhooks:* permission. create/rotate return the secret once. */
const qp = (env, org) => `?env=${env || "dev"}${org ? `&org=${encodeURIComponent(org)}` : ""}`;
export const webhooks = {
  list: (env) => request(`/api/webhooks?env=${env || "dev"}`),
  get: (id, env) => request(`/api/webhooks/${encodeURIComponent(id)}?env=${env || "dev"}`),
  create: (env, org, body) => request(`/api/webhooks${qp(env, org)}`, { method: "POST", body: JSON.stringify(body) }),
  update: (id, env, org, body) => request(`/api/webhooks/${encodeURIComponent(id)}${qp(env, org)}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id, env, org) => request(`/api/webhooks/${encodeURIComponent(id)}${qp(env, org)}`, { method: "DELETE" }),
  rotateSecret: (id, env, org) => request(`/api/webhooks/${encodeURIComponent(id)}/rotate-secret${qp(env, org)}`, { method: "POST" }),
  ping: (id, env, org) => request(`/api/webhooks/${encodeURIComponent(id)}/ping${qp(env, org)}`, { method: "POST" }),
  deliveries: (id, env, query = {}) => {
    const s = new URLSearchParams({ env: env || "dev" });
    if (query.status) s.set("status", query.status);
    if (query.take) s.set("take", String(query.take));
    return request(`/api/webhooks/${encodeURIComponent(id)}/deliveries?${s.toString()}`);
  },
  redeliver: (id, deliveryId, env, org) => request(`/api/webhooks/${encodeURIComponent(id)}/deliveries/${encodeURIComponent(deliveryId)}/redeliver${qp(env, org)}`, { method: "POST" }),
};

/* Products (catalog items / price links). list → { data, total }. */
export const products = {
  list: (env) => request(`/api/products?env=${env || "dev"}`),
  create: (env, org, body) => request(`/api/products${qp(env, org)}`, { method: "POST", body: JSON.stringify(body) }),
  update: (id, env, org, body) => request(`/api/products/${encodeURIComponent(id)}${qp(env, org)}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id, env, org) => request(`/api/products/${encodeURIComponent(id)}${qp(env, org)}`, { method: "DELETE" }),
};

/* Customers (merchant-managed, with derived stats). list → { data, total }. */
export const customers = {
  list: (env) => request(`/api/customers?env=${env || "dev"}`),
  create: (env, org, body) => request(`/api/customers${qp(env, org)}`, { method: "POST", body: JSON.stringify(body) }),
  update: (id, env, org, body) => request(`/api/customers/${encodeURIComponent(id)}${qp(env, org)}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id, env, org) => request(`/api/customers/${encodeURIComponent(id)}${qp(env, org)}`, { method: "DELETE" }),
};

/* Read-only dashboard aggregates derived from payments + webhooks + request logs. */
export const metrics = {
  summary: (env) => request(`/api/cosmos/summary?env=${env || "dev"}`),
  balances: (env) => request(`/api/cosmos/balances?env=${env || "dev"}`),
  apiLogs: (env) => request(`/api/cosmos/logs?env=${env || "dev"}`),
  webhookLogs: (env) => request(`/api/cosmos/webhook-logs?env=${env || "dev"}`),
};

/* Activity notifications — list is open to the user; create is owner/admin only (403 otherwise). */
export const notifications = {
  list: () => request("/api/notifications"),
  create: (body) => request("/api/notifications", { method: "POST", body: JSON.stringify(body) }),
  markRead: () => request("/api/notifications/read", { method: "POST", body: "{}" }),
};

/* Support tickets — customer side (own tickets). Each ticket has a subject + status. */
export const support = {
  tickets: () => request("/api/support/tickets"),
  unread: () => request("/api/support/unread"),
  create: (subject, body) => request("/api/support/tickets", { method: "POST", body: JSON.stringify({ subject, body }) }),
  ticket: (id) => request(`/api/support/tickets/${encodeURIComponent(id)}`),
  send: (id, body) => request(`/api/support/tickets/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ body }) }),
};

/* Support tickets — staff side (owner/admin/support). 403 for regular users. */
export const supportAdmin = {
  tickets: (status) => request(`/api/support/admin/tickets${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  ticket: (id) => request(`/api/support/tickets/${encodeURIComponent(id)}`),
  reply: (id, body) => request(`/api/support/tickets/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ body }) }),
  setStatus: (id, status) => request(`/api/support/tickets/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  setPriority: (id, priority) => request(`/api/support/tickets/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ priority }) }),
};

/* Account self-service: change own plan (mock billing) + update own profile
   (display name, bio, avatar). updateProfile body: { displayName?, bio?, avatarUrl? }
   where avatarUrl is a data URL to set, "" to clear. */
export const account = {
  setPlan: (plan) => request("/api/account/plan", { method: "PATCH", body: JSON.stringify({ plan }) }),
  updateProfile: (body) => request("/api/account/profile", { method: "PATCH", body: JSON.stringify(body) }),
};

/* Admin user management (owner/admin). 403 otherwise. */
export const admin = {
  users: () => request("/api/admin/users"),
  setUser: (userId, patch) => request(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(patch) }),
};

/* Invitations addressed to the signed-in user (shown in their own dashboard). */
export const invites = {
  mine: () => request("/api/invitations"),
  accept: (id) => request("/api/invitations/accept", { method: "POST", body: JSON.stringify({ id }) }),
};

/* Organizations CRUD + members. */
export const organizations = {
  list: () => request("/api/organizations"),
  create: (name, extra) => request("/api/organizations", { method: "POST", body: JSON.stringify({ name, ...(extra || {}) }) }),
  rename: (id, name) => request(`/api/organizations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  remove: (id) => request(`/api/organizations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  members: (id) => request(`/api/organizations/${encodeURIComponent(id)}/members`),
  removeMember: (id, userId) => request(`/api/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  updateMember: (id, userId, patch) => request(`/api/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  // Members join by email invitation (magic link), never added directly.
  invitations: (id) => request(`/api/organizations/${encodeURIComponent(id)}/invitations`),
  invite: (id, email, role, permissions) => request(`/api/organizations/${encodeURIComponent(id)}/invitations`, { method: "POST", body: JSON.stringify({ email, role, permissions }) }),
  revokeInvite: (id, invId) => request(`/api/organizations/${encodeURIComponent(id)}/invitations/${encodeURIComponent(invId)}`, { method: "DELETE" }),
};
