import type { User } from "@/components/cosmos/lib/types";

/* User avatar — real Authentik photo when present, initials fallback otherwise. */
export function Avatar({ user, size = 34 }: { user?: User | null; size?: number }) {
  const label = (user && (user.name || user.email)) || "?";
  const initials = label.trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const dim = { width: size, height: size };
  if (user && user.image) {
    return <img className="nav-av" src={user.image} alt={label} style={{ ...dim, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return <span className="nav-av nav-av-i" style={{ ...dim }}>{initials}</span>;
}
