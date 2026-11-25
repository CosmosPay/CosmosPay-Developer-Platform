import { platformOrigin } from "@/lib/wallet-proof-env";
import type { APIRoute } from "astro";

/* GET /api/wallet-proofs/tonconnect-manifest.json: the TON Connect manifest a TON wallet reads
   when the dashboard asks it to prove an address (src/lib/wallets/prove-networks.ts). Its `url` is
   the platform's origin, whose host the wallet signs into the ton_proof and the server expects
   (src/lib/wallet-proof-env.ts). Public: wallets fetch it without a session, from their own
   origin. */
export const GET: APIRoute = () => {
  const origin = platformOrigin();
  return new Response(JSON.stringify({ url: origin, name: "Cosmos Pay", iconUrl: `${origin}/apple-touch-icon.png` }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
