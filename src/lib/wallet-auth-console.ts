/* wallet-auth-console.ts — the two legs the community server hands back to this console.

   The wallet's sign-in now runs on the community server, which is the piece a developer can
   self-host. Two parts of it deliberately did NOT move, and they are the two this file
   serves:

     1. SENDING THE CODE. That service owns no mailer, exactly as it owns no mailer for
        alias recovery: it mints the token and lets whoever holds a sender deliver it. Here
        that is us.
     2. MINTING THE KEYS. That needs APISIX admin, and everything registered in that process
        is something an attacker who reached it could also call. "Mint a credential for any
        consumer" is not going on that list, and this console already holds admin for the
        dashboard's own key management — so the capability stays in one place instead of two.

   The direction is the mirror of `ConsoleOnlyGuard` over there: that guard admits only this
   console, and this file admits only that service. Both rest on one shared secret and a
   header APISIX strips from everything it proxies, so neither can be presented by a client.

   A deployment that sets no secret serves neither route. That is the correct state for a
   platform whose community server is not calling it, and it fails closed: an unset secret
   would otherwise compare equal to an absent header. */
import { WALLET_AUTH_CONSOLE_SECRET } from "astro:env/server";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderWalletLoginCodeEmail } from "@/lib/emails";
import { fallbackName, isConsoleCall } from "@/lib/wallet-auth-core";
import { provisionWalletAccount, type WalletKeys } from "@/lib/wallet-provisioning";

/**
 * Is this call from the community server?
 *
 * The decision itself is `isConsoleCall` in wallet-auth-core, which takes the secret as an
 * argument and so is reachable from tests/unit/walletAuthCore.test.ts. This wrapper only
 * supplies the configured value — which is the half a unit test cannot see.
 */
export function isCommunityServerCall(headers: Headers): boolean {
  return isConsoleCall(headers, WALLET_AUTH_CONSOLE_SECRET ?? "");
}

/** Whether this deployment can serve the console legs at all. */
export function consoleLegsConfigured(): boolean {
  return Boolean(WALLET_AUTH_CONSOLE_SECRET?.trim());
}

export interface LoginCodeDelivery {
  email: string;
  name: string | null;
  code: string;
  /** ISO instant, used only to tell the person how long they have. */
  expiresAt: string;
}

/**
 * Email a code the community server minted.
 *
 * This console never sees the hash that will check it and never decides whether it is
 * right — it addresses an envelope. Keeping it that thin is what stops a second place
 * having an opinion about when a sign-in succeeds.
 */
export async function deliverLoginCode(input: LoginCodeDelivery): Promise<void> {
  if (!isMailConfigured()) throw new Error("No mail transport configured");

  const expiresAt = Date.parse(input.expiresAt);
  const minutes = Number.isFinite(expiresAt)
    ? Math.max(1, Math.round((expiresAt - Date.now()) / 60000))
    : 15;

  const msg = renderWalletLoginCodeEmail({
    name: fallbackName(input.email, input.name),
    code: input.code,
    minutes,
  });
  await sendMail({ to: input.email, subject: msg.subject, html: msg.html, text: msg.text });
}

export interface ProvisionRequest {
  accountId: string;
  stellarAddress: string;
  email: string;
  name: string;
}

export interface ProvisionResult {
  organizationId: string;
  keys: { dev: string | null; prod: string | null };
}

/**
 * Create or link the platform account behind a finished sign-in, and mint its keys.
 *
 * The email arrives already PROVEN — by a provider this console never spoke to, or by a
 * code it merely posted. That is the assertion `provisionWalletAccount` is built on, and it
 * is why the caller being the community server, rather than anyone holding an API key, is
 * the whole of the authorization here.
 *
 * `accountId` is recorded rather than used: it is the community server's own id for the
 * wallet identity, and having it in the organization's metadata is what lets an operator
 * line the two sides up when something has to be traced across them.
 */
export async function provisionForWallet(input: ProvisionRequest): Promise<ProvisionResult> {
  const result = await provisionWalletAccount({
    email: input.email,
    name: input.name,
    stellarAddress: input.stellarAddress,
    kind: "wallet-signin",
    provisionedBy: `community-server:${input.accountId}`,
  });

  const keys: WalletKeys = result.keys;
  return {
    organizationId: result.organizationId,
    keys: { dev: keys.dev ?? null, prod: keys.prod ?? null },
  };
}
