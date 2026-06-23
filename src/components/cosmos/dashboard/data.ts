/* Mock datasets + display constants for the dashboard. All data is mock/sample
   (client-side); values are intentionally not translated. */

export const PAGE_SIZE = 8;

/* ---------------- datasets (mock — values not translated) ---------------- */
export const VOL = [38,41,40,45,43,49,52,48,55,58,54,62,60,67,71,68,74,79,83,80,88,92,96,94,101,108,112,118,124,128];
export const METRICS = [
  { k: "gross", v: "$128,430", c: "+12.4%", up: true, d: [40,44,42,50,55,60,72,90,128] },
  { k: "net", v: "$119,180", c: "+9.1%", up: true, d: [44,46,45,52,58,63,70,84,119] },
  { k: "success", v: "8,210", c: "+4.6%", up: true, d: [60,62,61,66,70,72,76,79,82] },
  { k: "newCust", v: "342", c: "+18.0%", up: true, d: [12,18,16,22,28,30,33,38,34] },
];
/* payment rows: [id, customer, amount, asset, statusKey, statusLabel, when] */
export const PAYMENTS0 = [
  ["ch_3Pq8Z2", "Acme Inc.", "420.00", "USDC", "ok", "Succeeded", "2 min ago"],
  ["ch_3Pq7Lk", "Lumio LLC", "1,250.00", "USDC", "ok", "Succeeded", "14 min ago"],
  ["ch_3Pq6Tg", "Quanta", "89.00", "USDC", "ok", "Succeeded", "31 min ago"],
  ["ch_3Pq5Wd", "Helios Co.", "2,400.00", "EURC", "ok", "Succeeded", "1 hour ago"],
  ["ch_3Pq4Rb", "Vertexa", "56.50", "USDC", "fail", "Failed", "2 hours ago"],
  ["ch_3Pq3Nm", "Novex", "310.00", "USDC", "ref", "Refunded", "3 hours ago"],
  ["ch_3Pq2Hj", "Riverstone", "780.00", "USDC", "ok", "Succeeded", "5 hours ago"],
  ["ch_3Pq1Bf", "Cobalt", "142.25", "EURC", "ok", "Succeeded", "6 hours ago"],
  ["ch_3Pq0Za", "Northwind", "5,100.00", "USDC", "ok", "Succeeded", "8 hours ago"],
  ["ch_3Ppz9X", "Lumio LLC", "64.00", "USDC", "ok", "Succeeded", "10 hours ago"],
];
export const CUSTOMERS0 = [
  ["Acme Inc.", "billing@acme.com", "$12,480", 38, "Apr 2025"],
  ["Lumio LLC", "ap@lumio.io", "$8,940", 24, "May 2025"],
  ["Helios Co.", "finance@helios.co", "$31,200", 51, "Jan 2025"],
  ["Vertexa", "pay@vertexa.dev", "$2,310", 9, "Aug 2025"],
  ["Riverstone", "ops@riverstone.com", "$6,720", 17, "Mar 2025"],
  ["Novex", "hello@novex.app", "$1,090", 5, "Sep 2025"],
  ["Cobalt", "team@cobalt.xyz", "$4,460", 14, "Jun 2025"],
  ["Northwind", "accounts@northwind.com", "$58,300", 96, "Nov 2024"],
];
export const LOGS = [
  ["POST", "/v1/payments", 200, 41, "12:04:31"],
  ["GET", "/v1/balances", 200, 22, "12:04:18"],
  ["POST", "/v1/payments", 200, 38, "12:03:55"],
  ["GET", "/v1/customers", 200, 29, "12:03:40"],
  ["POST", "/v1/payouts", 402, 64, "12:03:12"],
  ["POST", "/v1/webhooks", 201, 33, "12:02:50"],
  ["GET", "/v1/payments/ch_3Pq", 200, 19, "12:02:31"],
  ["DELETE", "/v1/keys/sk_test", 200, 27, "12:01:58"],
  ["POST", "/v1/payments", 429, 12, "12:01:30"],
  ["GET", "/v1/balances", 200, 24, "12:01:05"],
];
export const BALANCES = [
  { asset: "USDC", amount: "48,210.00", fiat: "$48,210.00", pct: 72 },
  { asset: "EURC", amount: "12,540.00", fiat: "$13,420.80", pct: 20 },
  { asset: "XLM", amount: "92,300.00", fiat: "$10,153.00", pct: 8 },
];
/* product rows: [name, price, typeKey, statusKey, statusLabel] */
export const PRODUCTS0 = [
  ["Pro plan — monthly", "49.00 USDC", "Recurring", "ok", "Active"],
  ["Pro plan — yearly", "490.00 USDC", "Recurring", "ok", "Active"],
  ["One-time setup", "250.00 USDC", "One-time", "ok", "Active"],
  ["Donation link", "Customer-set", "Payment link", "ok", "Active"],
];
export const WEBHOOKS0 = [
  ["https://api.acme.com/hooks/cosmos", "ok", "Active", 4],
  ["https://staging.acme.com/cosmos", "ok", "Active", 12],
];
export const DELIVERIES = [
  ["payment.succeeded", "ok", "200", "2 min ago"],
  ["payment.succeeded", "ok", "200", "14 min ago"],
  ["payout.completed", "ok", "200", "31 min ago"],
  ["payment.failed", "fail", "500", "1 hour ago"],
  ["customer.created", "ok", "200", "2 hours ago"],
];
/* activity rows: [iconKey, detail, when] — title comes from the catalog by iconKey */
export const ACTS = [
  ["key", "sk_live_ ••• 4f2a", "1h"],
  ["webhook", "payment.succeeded", "2h"],
  ["payments", "$9,420.00 · Stellar", "5h"],
  ["customers", "novex.app", "6h"],
];

/* ---------------- display constants ---------------- */
export const PERM_OPTIONS = ["read", "write"];
/* Plan price tags now live in the shared plan specs: import { PLAN_PRICE } from "@/lib/plans". */
/* Admin: assign roles + plans to accounts (owner/admin only). */
export const ROLE_OPTIONS = ["user", "support", "admin", "owner"];
export const PLAN_OPTIONS = ["community", "starter", "essentials", "growth", "enterprise"];

/* ---------------- shell config ---------------- */
export const SIDE = [
  { sec: "Platform", items: ["overview", "payments", "balances", "customers", "products"] },
  { sec: "Build", items: ["developers", "webhook", "logs", "weblogs"] },
  { sec: "Support", items: ["support", "inbox"] },
  { sec: "Account", items: ["activity", "users", "settings", "account"] },
];
export const STAFF_ROLES = ["owner", "admin", "support"];
export const MANAGER_ROLES = ["owner", "admin"];
export const STAFF_ONLY = ["inbox"];   // visible to owner/admin/support
export const MANAGER_ONLY = ["users"]; // visible to owner/admin only
