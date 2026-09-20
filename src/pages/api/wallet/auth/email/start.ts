/* POST /api/wallet/auth/email/start — email a six-digit sign-in code.

   Answers `sent` for any well-formed address that got through the budgets, whether or not
   it has an account: anything else would make this route a way to ask which emails are
   CosmosPay customers. The `claimToken` it returns is what the wallet presents with the
   code at POST /api/wallet/auth/email/verify. */
import { ApiStatus, jsonCreated, jsonError, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { startEmailLogin } from "@/lib/wallet-auth";
import { walletAuthEmailStartBodySchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletAuthEmailStartBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await startEmailLogin({
    email: body.data.email,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not send the code", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  switch (result.status) {
    case "sent":
      return jsonCreated({ data: result, message: "We emailed you a sign-in code." });
    case "rate_limited":
      return jsonError({
        message: "A code was just sent — wait a moment before asking for another.",
        code: 429,
        status: ApiStatus.BAD_REQUEST,
      });
    case "email_unavailable":
      return jsonError({ message: "Email delivery is not available right now.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
};
