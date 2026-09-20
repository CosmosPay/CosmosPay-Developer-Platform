/* GET /api/wallet/auth/oauth/callback/{provider}?code&state — where Google or GitHub sends
   the person back. Registered with each provider as the redirect URI.

   It reads who the person is and parks it on the handshake; the wallet, polling in its own
   window, collects it with the PKCE verifier. Nothing is handed to this browser, so the
   page only says "go back to the wallet" — in the person's language when it is one the
   wallet speaks, since this is the one screen of the sign-in the wallet does not draw. */
import { completeOAuthCallback } from "@/lib/wallet-auth";
import { walletAuthProviderParamSchema, walletAuthStateParamSchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

type Outcome = "ok" | "expired" | "denied" | "email_unverified" | "failed";
type Lang = "en" | "es" | "pt" | "de" | "fr";

const COPY: Record<Lang, Record<Outcome, [string, string]>> = {
  en: {
    ok: ["You're signed in", "Go back to the Cosmos Pay Wallet to continue. You can close this window."],
    expired: ["This sign-in expired", "Go back to the Cosmos Pay Wallet and start the sign-in again."],
    denied: ["Sign-in cancelled", "Nothing was shared. Go back to the Cosmos Pay Wallet to try again."],
    email_unverified: ["Email not verified", "Your account has no verified email. Verify it with the provider, or sign in with an email code instead."],
    failed: ["Sign-in failed", "The provider did not answer. Go back to the Cosmos Pay Wallet and try again."],
  },
  es: {
    ok: ["Sesión iniciada", "Volvé a Cosmos Pay Wallet para continuar. Ya podés cerrar esta ventana."],
    expired: ["El inicio de sesión expiró", "Volvé a Cosmos Pay Wallet e iniciá sesión de nuevo."],
    denied: ["Inicio de sesión cancelado", "No se compartió nada. Volvé a Cosmos Pay Wallet para intentarlo otra vez."],
    email_unverified: ["Email sin verificar", "Tu cuenta no tiene un email verificado. Verificalo con el proveedor o entrá con un código por email."],
    failed: ["No se pudo iniciar sesión", "El proveedor no respondió. Volvé a Cosmos Pay Wallet e intentalo otra vez."],
  },
  pt: {
    ok: ["Você entrou", "Volte à Cosmos Pay Wallet para continuar. Você já pode fechar esta janela."],
    expired: ["O login expirou", "Volte à Cosmos Pay Wallet e faça login novamente."],
    denied: ["Login cancelado", "Nada foi compartilhado. Volte à Cosmos Pay Wallet para tentar de novo."],
    email_unverified: ["Email não verificado", "Sua conta não tem um email verificado. Verifique-o com o provedor ou entre com um código por email."],
    failed: ["Não foi possível entrar", "O provedor não respondeu. Volte à Cosmos Pay Wallet e tente de novo."],
  },
  de: {
    ok: ["Du bist angemeldet", "Kehre zur Cosmos Pay Wallet zurück, um fortzufahren. Du kannst dieses Fenster schließen."],
    expired: ["Die Anmeldung ist abgelaufen", "Kehre zur Cosmos Pay Wallet zurück und melde dich erneut an."],
    denied: ["Anmeldung abgebrochen", "Es wurde nichts geteilt. Kehre zur Cosmos Pay Wallet zurück, um es erneut zu versuchen."],
    email_unverified: ["E-Mail nicht bestätigt", "Dein Konto hat keine bestätigte E-Mail. Bestätige sie beim Anbieter oder melde dich mit einem E-Mail-Code an."],
    failed: ["Anmeldung fehlgeschlagen", "Der Anbieter hat nicht geantwortet. Kehre zur Cosmos Pay Wallet zurück und versuche es erneut."],
  },
  fr: {
    ok: ["Vous êtes connecté", "Retournez dans Cosmos Pay Wallet pour continuer. Vous pouvez fermer cette fenêtre."],
    expired: ["La connexion a expiré", "Retournez dans Cosmos Pay Wallet et reconnectez-vous."],
    denied: ["Connexion annulée", "Rien n'a été partagé. Retournez dans Cosmos Pay Wallet pour réessayer."],
    email_unverified: ["E-mail non vérifié", "Votre compte n'a pas d'e-mail vérifié. Vérifiez-le auprès du fournisseur ou connectez-vous avec un code par e-mail."],
    failed: ["La connexion a échoué", "Le fournisseur n'a pas répondu. Retournez dans Cosmos Pay Wallet et réessayez."],
  },
};

/** The first language in Accept-Language that the wallet speaks; English otherwise. */
function langOf(header: string | null): Lang {
  for (const part of (header ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (code in COPY) return code as Lang;
  }
  return "en";
}

function page(outcome: Outcome, lang: Lang): Response {
  const [title, body] = COPY[lang][outcome];
  const ok = outcome === "ok";
  // The copy is ours and fixed, so there is nothing here to escape.
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} · Cosmos Pay</title></head>
<body style="margin:0;background:#000;color:#fff;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="max-width:440px;padding:32px;text-align:center">
<div style="font-size:40px;line-height:1;margin-bottom:12px;color:${ok ? "#16a34a" : "#dc2626"}">${ok ? "✓" : "✕"}</div>
<h1 style="font-size:20px;margin:0 0 10px">${title}</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0">${body}</p>
</div></body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    // Never cached, never framed: this page ends a sign-in.
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export const GET: APIRoute = async (ctx) => {
  const lang = langOf(ctx.request.headers.get("accept-language"));
  const provider = walletAuthProviderParamSchema.safeParse(ctx.params);
  const state = walletAuthStateParamSchema.safeParse({ state: ctx.url.searchParams.get("state") ?? "" });
  if (!provider.success || !state.success) return page("expired", lang);

  const result = await completeOAuthCallback({
    provider: provider.data.provider,
    state: state.data.state,
    code: ctx.url.searchParams.get("code"),
    providerError: ctx.url.searchParams.get("error"),
  }).catch(() => ({ ok: false as const, reason: "failed" as const }));

  return page(result.ok ? "ok" : result.reason, lang);
};
