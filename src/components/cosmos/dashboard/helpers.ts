/* Pure helpers for the dashboard: status-label lookup, initials, date formatters,
   and the activity-notification helpers (icon/location/ip/device). */
import { DI } from "./icons";

export const initials = (n) => (n || "?").trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

/* translate a known status label, falling back to the raw value */
export function sl(t, label) { return (t.dash.statusLabels && t.dash.statusLabels[label]) || label; }

/* Format an APISIX timestamp (unix seconds, numeric string, or ISO) for display. */
export function fmtDate(v) {
  if (v == null || v === "") return "—";
  let d;
  if (typeof v === "number") d = new Date(v < 1e12 ? v * 1000 : v);
  else if (/^\d+$/.test(String(v))) d = new Date(Number(v) * 1000);
  else d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

export function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/* Icon + relative date helpers for activity notifications. */
export function notifIcon(type) {
  if (type === "auth.login") return DI.user;
  if (type && type.indexOf("apikey") === 0) return DI.key;
  if (type && type.indexOf("support") === 0) return DI.support;
  return DI.bell;
}
export function fmtWhen(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
/* Render loopback addresses as "localhost" (covers older notifications stored as ::1). */
export function humanizeLocal(s) {
  return typeof s === "string" ? s.replace(/::1|127\.0\.0\.1/g, "localhost") : s;
}
export function notifMeta(n) {
  return humanizeLocal([n.origin, n.country].filter(Boolean).join(" · "));
}
export function notifMd(n) { return (n && n.metadata) || {}; }
/* Full location line: City, Region, Country (city lives in metadata). */
export function notifLocation(n) {
  const md = notifMd(n);
  return [md.city, n.region, n.country].filter(Boolean).join(", ");
}
/* IP line: shows "localhost" plus the resolved public IP when in dev. */
export function notifIp(n) {
  const md = notifMd(n);
  if (md.local && md.publicIp) return `${humanizeLocal(n.ipAddress) || "localhost"} · ${md.publicIp}`;
  return humanizeLocal(n.ipAddress) || "";
}
/* Compact "Browser · OS" label from a user-agent string. */
export function deviceLabel(n) {
  const ua = notifMd(n).userAgent;
  if (!ua) return "";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [br, os].filter(Boolean).join(" · ");
}
