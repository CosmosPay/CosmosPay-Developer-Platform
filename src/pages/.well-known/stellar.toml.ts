/* GET /.well-known/stellar.toml — how a client that is not our wallet finds this server.

   SEP-30 defines no discovery at all: it describes the endpoints and says nothing about
   how a client learns the base URL or who it is talking to. SEP-10 does, and since every
   SEP-30 call is authenticated with a SEP-10 token, this file is what makes the pair
   usable by anyone else. Two fields carry it (SEP-1 §"Account Information"):

   - `WEB_AUTH_ENDPOINT` — where to get and return a challenge.
   - `SIGNING_KEY` — the account that signs those challenges. This is the one that matters.
     A client that skips it has no way to tell a challenge from this server apart from a
     challenge minted by whoever answered the request, and SEP-10's whole proof rests on
     that signature. Our own wallet checks it (src/lib/sep10.ts in the wallet repo); so
     will anyone else's, and they can only check it if we publish it.

   `NETWORK_PASSPHRASE` is here for the reason src/pages/api/recovery/info.ts exists: a
   signer is an entry on ONE ledger, and a wallet that registers against a server on
   another network finds out at recovery time, which is the one moment nothing can be
   fixed. The recovery block below is not a SEP-1 field — it is how the sibling server and
   the role are published, which SEP-30 leaves to the operator.

   Served from every deployment, and one that is not a recovery server says so with a 404
   rather than a file with empty fields: absent is a fact a client can act on, whereas
   `SIGNING_KEY=""` is a file that looks answerable and is not. */
import { Keypair } from "@stellar/stellar-sdk";
import { recoveryConfig } from "@/lib/recovery-config";
import type { APIRoute } from "astro";

/** TOML basic string: the spec's escapes, and no newline can survive into a value. */
const q = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`;

export const GET: APIRoute = async ({ url }) => {
  const cfg = recoveryConfig();
  if (!cfg) return new Response("Not found", { status: 404 });

  // Derived from the secret, never configured alongside it: two fields that must agree
  // are two fields that can disagree, and this one disagreeing means every challenge this
  // server signs is rejected by every client that checked.
  const signingKey = Keypair.fromSecret(cfg.sep10.signingSecret).publicKey();

  const toml = [
    "# Cosmos Pay — SEP-30 recovery server.",
    "# The endpoints are SEP-30's; the tokens are SEP-10's; both answer in the shape their",
    "# spec describes, not in this API's envelope. See src/lib/sep-http.ts.",
    "",
    `VERSION = ${q("2.7.0")}`,
    `NETWORK_PASSPHRASE = ${q(cfg.sep10.networkPassphrase)}`,
    `HORIZON_URL = ${q(cfg.horizonUrl)}`,
    `WEB_AUTH_ENDPOINT = ${q(`${url.origin}/api/sep10/auth`)}`,
    `SIGNING_KEY = ${q(signingKey)}`,
    // The domain the challenges name, which is the WALLET's, not this host's. The two
    // recovery servers are different hosts and deliberately share this one: a client is
    // meant to check that both name the same wallet, and whoever controls one server
    // cannot change what the other says. A client that assumed the home domain was just
    // the host it fetched this from would see two servers disagreeing by construction.
    `HOME_DOMAIN = ${q(cfg.sep10.homeDomain)}`,
    "",
    "[[RECOVERY_SERVERS]]",
    `ENDPOINT = ${q(`${url.origin}/api/recovery`)}`,
    `WEB_AUTH_ENDPOINT = ${q(`${url.origin}/api/sep10/auth`)}`,
    `SIGNING_KEY = ${q(signingKey)}`,
    // Which of the two this is. A client needs both to recover an account and neither
    // alone is any use, so a server that did not say which it was would leave the caller
    // unable to tell it has two of the same one.
    `ROLE = ${q(cfg.role)}`,
    "",
  ].join("\n");

  return new Response(toml, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // SEP-1 requires CORS open: the client reading this is a browser wallet on another
      // origin, and a file nobody may fetch discovers nothing.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
};
