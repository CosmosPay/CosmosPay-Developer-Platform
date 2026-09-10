/* public-key.ts — the shared API key every copy of the wallet carries.

   The point is the first-run experience: someone installs the wallet, funds it and
   wants to swap. Registering an account first — email, verification link, a claim
   round trip — is a wall in front of the one thing they came to do. So the wallet
   ships a key that already works, and the price of using it is the commission:
   the `community` plan's 150 bps, the highest rate on the board. Registering is
   what buys a lower one, which makes the upgrade an offer rather than a toll gate.

   THIS KEY IS NOT A SECRET. It is compiled into an open-source binary published on
   app stores; treating it as a credential would be self-deception. Everything that
   keeps it safe is on the other side:

     - It is minted with `role: 'public'`, which the Payments service's
       PublicKeyGuard recognizes and uses to confine it to handlers marked
       @AllowPublicKey — quotes, envelope builders, on-chain reads, telemetry
       ingest. Every endpoint that replays what a consumer previously wrote is
       refused, because all anonymous callers ARE this one consumer and would
       otherwise read each other's history.
     - It holds only the scopes those handlers need. Not a superset "for later":
       a credential held by everyone should be exactly as wide as its job.
     - It signs nothing. The wallet stays non-custodial — the gateway returns an
       unsigned envelope and the device holds the key that signs it.

   Rotation is therefore cheap and expected: mint a new one, and wallets pick it up
   from `/api/public-key` on their next fetch. Wallets that cannot reach that route
   fall back to the key compiled into their build, so rotating does not brick
   anything — it just stops being effective for old installs once the previous key
   is deleted. Delete deliberately. */
import { prisma } from "@/lib/prisma";
import { createOrg, listForUser } from "@/lib/organizations";
import {
  createApiKey,
  createConsumer,
  keyPrefix,
  listUserApiKeys,
  parseApiKeyEnv,
  syncConsumerForwarder,
} from "@/utils/apisix";

/* A fixed id, so the APISIX consumer username is deterministic (`cosmos_public`)
   and the Payments service can be told about it once, in its
   APISIX_PUBLIC_CONSUMER env var, rather than after every redeploy. */
export const PUBLIC_USER_ID = "public";
export const PUBLIC_CONSUMER = `${keyPrefix}${PUBLIC_USER_ID}`;

/* A non-routable address on a reserved domain (RFC 2606). The account must exist
   for the organization FK and the plan lookup, and must never be something a
   person could register or receive mail at. */
const PUBLIC_EMAIL = "public-key@cosmospay.invalid";

/**
 * Exactly the scopes the allowlisted routes require, and nothing else.
 *
 * Notably absent: `activity:read` (it would replay every anonymous wallet's
 * telemetry), every `kyc:*` / `onramp:*` / `offramp:*` scope (identity documents
 * and bank accounts are per-person by definition), `pollar:*` (social login mints
 * a wallet — behind a shared credential that is an open faucet), and
 * `webhooks:*` / `products:*` / `customers:*` (merchant configuration).
 *
 * `activity:write` IS here, and it matters: a wallet with no account still
 * crashes, and without this scope its error reports would be refused with a 403 —
 * blinding us to exactly the population that meets first-run failures. Events on
 * this key are anonymous by construction, so the wallet strips anything that
 * names an account or a transaction before sending.
 *
 * `swaps:read` is here only because `POST /v1/swaps/quote` requires it. It also
 * unlocks `GET /v1/swaps`, which is why the Payments service does not rely on
 * scopes alone for this key — see PublicKeyGuard.
 */
export const PUBLIC_KEY_SCOPES = [
  "swaps:read",
  "swaps:write",
  "liquidity:read",
  "liquidity:write",
  "payments:read",
  "payments:write",
  "activity:write",
];

export interface PublicKeys {
  dev: string | null;
  prod: string | null;
}

/** The synthetic account that owns the public consumer, created on first use. */
async function ensurePublicAccount(): Promise<string> {
  const existing = await prisma.user
    .findUnique({ where: { id: PUBLIC_USER_ID }, select: { id: true } })
    .catch(() => null);
  if (!existing) {
    await prisma.user.create({
      data: {
        id: PUBLIC_USER_ID,
        email: PUBLIC_EMAIL,
        name: "CosmosPay public access",
        emailVerified: true,
      },
    });
  }
  // The plan is what sets the commission: the forwarder bakes the org owner's
  // plan rate into every request this key makes, so `community` here IS the 1.5%.
  await prisma.profile
    .upsert({
      where: { userId: PUBLIC_USER_ID },
      create: { userId: PUBLIC_USER_ID, plan: "community" },
      update: { plan: "community" },
    })
    .catch(() => null);
  return PUBLIC_USER_ID;
}

/** The organization the public key is attributed to, created on first use. */
async function ensurePublicOrg(userId: string): Promise<string> {
  const orgs = await listForUser(userId).catch(() => []);
  const existing = orgs.find((o) => o.role === "owner") ?? orgs[0];
  if (existing) return existing.id;
  const created = await createOrg(userId, "CosmosPay public access", true, {
    provisionedBy: "public-key",
  });
  return created.org?.id ?? "";
}

/** Raw key values for the public consumer, bucketed by environment. */
async function readPublicKeys(): Promise<PublicKeys> {
  const credentials = await listUserApiKeys(PUBLIC_USER_ID).catch(() => []);
  const keys: PublicKeys = { dev: null, prod: null };
  for (const credential of Array.isArray(credentials) ? credentials : []) {
    const value = credential?.value;
    const raw = value?.plugins?.["key-auth"]?.key ?? null;
    if (!raw) continue;
    keys[parseApiKeyEnv(value?.labels?.env)] = raw;
  }
  return keys;
}

/**
 * Repairs the APISIX side of the public consumer, whether or not a key is missing.
 *
 * Two things have to exist for a public key to WORK, and only one of them is a key:
 * the consumer itself, and the forwarder plugin on it that turns each credential into
 * the `X-Consumer-Role` / `-Permissions` / `-Env` / `-Org` headers the Payments service
 * reads. A key with no forwarder still authenticates — so it looks provisioned from
 * here — and then arrives upstream with role `null` and no scopes, where PermissionsGuard
 * refuses it and PublicKeyGuard does not recognise it as public. Nothing about that
 * state heals on its own, and nothing about it is visible from `/api/public-key`, which
 * only ever asked whether a key existed.
 *
 * Both calls are idempotent and cheap: `createConsumer` returns early when the consumer
 * is there (a blind PUT would wipe the forwarder), and `syncConsumerForwarder` compares
 * the baked Lua against what is already deployed and skips the write when they match.
 * So the common path costs two GETs, which is what makes it safe to run on the cold
 * path of every `/api/public-key` fetch rather than only when minting.
 */
async function healPublicConsumer(userId: string): Promise<void> {
  await createConsumer(userId).catch(() => null);
  await syncConsumerForwarder(userId).catch(() => null);
}

/**
 * The public keys, provisioning them if they do not exist yet.
 *
 * Idempotent and safe to call on every request: the common path is one APISIX
 * list call, and the callers cache on top of it. Both environments are minted
 * together because a wallet switching to testnet must not have to re-fetch from a
 * different place — dev is testnet, prod is mainnet, same as everywhere else.
 *
 * The heal runs on EVERY call, not only when a key is missing. Returning early on
 * "both keys exist" is what let a consumer with a missing or stale forwarder sit there
 * indefinitely, handing out keys that authenticate and are then refused for having no
 * scopes — see healPublicConsumer.
 */
export async function ensurePublicKeys(): Promise<PublicKeys> {
  const existing = await readPublicKeys();
  if (existing.dev && existing.prod) {
    // The account and the org are already implied by the credentials existing; only the
    // APISIX half can rot underneath them, so that is the only half re-checked here.
    await healPublicConsumer(PUBLIC_USER_ID);
    return existing;
  }

  const userId = await ensurePublicAccount();
  const organizationId = await ensurePublicOrg(userId);
  await createConsumer(userId).catch(() => null);

  const mint = (environment: "dev" | "prod", label: string) =>
    createApiKey(
      userId,
      environment,
      PUBLIC_KEY_SCOPES,
      "public",
      `CosmosPay public access (${label})`,
      "Shared key embedded in the open-source wallet. Not a secret; " +
        "confined by PublicKeyGuard to routes that return no per-consumer rows.",
      organizationId || undefined,
    ).catch(() => null);

  // Only mint what is missing, so a partial failure last time heals rather than
  // stacking a second credential onto the same environment.
  if (!existing.dev) await mint("dev", "testnet");
  if (!existing.prod) await mint("prod", "mainnet");

  // `createApiKey` syncs the forwarder itself, but it does so per key: the dev mint bakes
  // a map that knows only the dev credential. One more sync here is what makes the map
  // describe both, and it is a no-op when the second mint already produced that map.
  await syncConsumerForwarder(userId).catch(() => null);

  return readPublicKeys();
}
