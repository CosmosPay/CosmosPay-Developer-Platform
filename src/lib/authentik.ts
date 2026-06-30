/* authentik.ts — minimal Authentik admin-API client used to give a wallet-provisioned
   CosmosPay account a real identity in Authentik (auth.cosmospay.lat), so the user can
   log in there. The dashboard already uses Authentik as its OAuth provider; here we just
   create the user up-front and (best-effort) hand them a link to set their password.

   Everything is best-effort and gated by AUTHENTIK_API_URL + AUTHENTIK_API_TOKEN: when
   those aren't set we skip Authentik provisioning entirely (the dev-platform account
   still works and links to Authentik on first OAuth sign-in via account linking). */
import { AUTHENTIK_API_URL, AUTHENTIK_API_TOKEN } from "astro:env/server";

const TIMEOUT_MS = 12_000;

export function isAuthentikApiConfigured(): boolean {
  return Boolean(AUTHENTIK_API_URL && AUTHENTIK_API_TOKEN);
}

function base(): string {
  return AUTHENTIK_API_URL.replace(/\/+$/, "");
}

async function akFetch(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base()}/api/v3${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${AUTHENTIK_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Authentik ${res.status}`);
    if (res.status === 204) return null;
    return await res.json().catch(() => null);
  } finally {
    clearTimeout(timer);
  }
}

/** Find an existing Authentik user id (pk) by email, or null. */
async function findUserByEmail(email: string): Promise<number | null> {
  const data = await akFetch(`/core/users/?email=${encodeURIComponent(email)}`).catch(() => null);
  const results: any[] = data?.results ?? [];
  return results.length ? (results[0].pk as number) : null;
}

/** Create (or find) an Authentik internal user for this email; returns its pk or null. */
async function ensureUser(email: string, name: string): Promise<number | null> {
  const existing = await findUserByEmail(email).catch(() => null);
  if (existing) return existing;
  const created = await akFetch(`/core/users/`, {
    method: "POST",
    body: { username: email, name, email, is_active: true, type: "internal", path: "users" },
  }).catch(() => null);
  return (created?.pk as number) ?? null;
}

/* Generate a one-time recovery link the user can follow to set their Authentik password.
   Requires a recovery flow on the instance; returns null if unavailable. */
async function recoveryLink(pk: number): Promise<string | null> {
  const data = await akFetch(`/core/users/${pk}/recovery/`, { method: "POST" }).catch(() => null);
  return (data?.link as string) ?? null;
}

export interface AuthentikProvisionResult {
  created: boolean;
  /** A link to set the Authentik password, when the recovery flow is available. */
  setupUrl: string | null;
}

/* Ensure an Authentik identity exists for a freshly provisioned CosmosPay account and,
   when possible, return a password-setup link. Never throws — returns a neutral result
   if Authentik isn't configured or the call fails. */
export async function provisionAuthentikIdentity(input: {
  email: string;
  name: string;
}): Promise<AuthentikProvisionResult> {
  if (!isAuthentikApiConfigured()) return { created: false, setupUrl: null };
  const email = input.email.trim().toLowerCase();
  const pk = await ensureUser(email, input.name).catch(() => null);
  if (!pk) return { created: false, setupUrl: null };
  const setupUrl = await recoveryLink(pk).catch(() => null);
  return { created: true, setupUrl };
}
