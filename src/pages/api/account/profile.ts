import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { updateOwnProfile } from "@/lib/profile";
import type { APIRoute } from "astro";

// Avatars are stored as small, client-resized data URLs (no file storage needed).
// Cap the encoded string so a malicious client can't dump megabytes into the row.
const MAX_AVATAR = 700_000;
const AVATAR_DATA_URL = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

const bodySchema = z
  .object({
    displayName: z.string().max(120).optional(),
    bio: z.string().max(400).optional(),
    // "" clears the custom avatar (falls back to the OAuth photo); a data URL sets one.
    avatarUrl: z.string().max(MAX_AVATAR).optional(),
  })
  .strict();

/* PATCH /api/account/profile — update the signed-in account's own profile
   (display name, bio, avatar). Email and role stay managed by the OAuth/SSO sign-in. */
export const PATCH: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const { displayName, bio, avatarUrl } = body.data;
  if (avatarUrl !== undefined && avatarUrl !== "" && !AVATAR_DATA_URL.test(avatarUrl)) {
    return jsonError({ message: "Unsupported image", code: 400, status: "bad_request" });
  }

  const patch: { displayName?: string | null; bio?: string | null; avatarUrl?: string | null } = {};
  if (displayName !== undefined) patch.displayName = displayName.trim() || null;
  if (bio !== undefined) patch.bio = bio.trim() || null;
  if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl || null;

  const updated = await updateOwnProfile(session.user.id, patch).catch(() => null);
  if (!updated) {
    return jsonError({ message: "Failed to update profile", code: 500, status: "internal_error" });
  }
  return jsonSuccess({
    data: { displayName: updated.displayName, bio: updated.bio, avatarUrl: updated.avatarUrl },
    message: "Profile updated",
  });
};
