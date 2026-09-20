/* GET /api/wallet/auth/providers — which ways of signing in this deployment offers.

   Public: the wallet asks before it has anything. A provider appears only when its OAuth app
   is configured here, so the wallet never shows a button that can only fail; `email` is
   false when this deployment cannot send mail, which is the one dependency the code
   sign-in has. See src/lib/wallet-auth.ts. */
import { jsonSuccess } from "@/lib/http";
import { isMailConfigured } from "@/lib/mailer";
import { configuredProviders } from "@/lib/wallet-auth";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () =>
  jsonSuccess({
    data: { providers: configuredProviders(), email: isMailConfigured() },
    message: "OK",
  });
