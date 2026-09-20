/* GET /api/recovery/info — what this recovery server is, for a wallet deciding whether to
   use it: which role it plays, which network its signers live on, and the home domain its
   SEP-10 challenges name.

   Not part of SEP-30. It exists because a signer is an entry on ONE ledger, so a wallet on
   testnet must not register against a mainnet server and discover the mismatch at
   recovery time — the one moment when nothing can be fixed. */
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { recoveryConfig } from "@/lib/recovery-config";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const cfg = recoveryConfig();
  if (!cfg) {
    return jsonError({ message: "This deployment is not a recovery server.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
  return jsonSuccess({
    data: {
      role: cfg.role,
      network: cfg.network,
      network_passphrase: cfg.sep10.networkPassphrase,
      home_domain: cfg.sep10.homeDomain,
      web_auth_domain: cfg.sep10.webAuthDomain,
      web_auth_endpoint: "/api/sep10/auth",
    },
    message: "OK",
  });
};
