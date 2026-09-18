/* GET /api/wallet/verify?token=... — the one-time link emailed during wallet account
   provisioning. Clicking it proves the user owns the email, which creates the account +
   a swaps-scoped API key (held for the wallet to claim). Returns a simple HTML page. */
import { confirmWalletRegistration } from "@/lib/wallet-provisioning";
import type { APIRoute } from "astro";

function page(title: string, body: string, ok: boolean, setupUrl?: string | null): Response {
  // verde y rojo son estado, no marca: se quedan (BRAND.md, seccion 3)
  const accent = ok ? "#16a34a" : "#dc2626";
  // en oscuro el primario es blanco con texto negro (BRAND.md, seccion 7)
  const cta = setupUrl
    ? `<p style="margin:26px 0 0"><a href="${setupUrl}" style="display:inline-block;padding:13px 24px;background:#FFFFFF;color:#000000;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">Set your dashboard password</a></p>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preload" href="/fonts/OpenSauceOne-Regular.woff2" as="font" type="font/woff2" crossorigin />
<style>@font-face{font-family:'Open Sauce One';src:url('/fonts/OpenSauceOne-Regular.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}</style>
<title>${title} · CosmosPay</title></head>
<body style="margin:0;background:#000000;color:#FFFFFF;font-family:'Open Sauce One',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:440px;padding:32px;text-align:center">
<img src="/brand/lockup-cosmos-pay-mono.svg" alt="Cosmos Pay" style="height:34px;width:auto;display:block;margin:0 auto 28px;filter:invert(1)" />
<div style="font-size:40px;line-height:1;margin-bottom:12px;color:${accent}">${ok ? "✓" : "✕"}</div>
<h1 style="font-size:20px;margin:0 0 10px;font-weight:600">${title}</h1>
<p style="color:rgba(255,255,255,.66);font-size:15px;line-height:1.6;margin:0">${body}</p>
${cta}
</div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const GET: APIRoute = async (ctx) => {
  const token = ctx.url.searchParams.get("token") ?? "";
  if (!token) {
    return page("Invalid link", "This confirmation link is missing its token.", false);
  }

  const result = await confirmWalletRegistration(token).catch(
    () => ({ ok: false as const, setupUrl: null }),
  );
  if (!result.ok) {
    return page(
      "Link expired or invalid",
      "This confirmation link has expired or was already used. Open the CosmosPay Wallet and try enabling payments again.",
      false,
    );
  }

  const setupUrl = "setupUrl" in result ? result.setupUrl : null;
  const body = setupUrl
    ? "Your CosmosPay account is ready. Return to the CosmosPay Wallet — it will finish connecting automatically. You can also set a password below to sign in to the developer dashboard."
    : "Your CosmosPay account is ready. Return to the CosmosPay Wallet — it will finish connecting automatically. You can sign in to the developer dashboard any time with this email.";
  return page("Email confirmed", body, true, setupUrl);
};
