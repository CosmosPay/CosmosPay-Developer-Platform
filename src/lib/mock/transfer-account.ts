/* Mock mode's bank-transfer account (QR charges' "Bank transfers" card): what the community server's
   `GET` / `POST /v1/onramp/transfer/account` answer through the dashboard's /api/onramp proxy
   (routes in src/lib/mock/handlers/p2p-ramp.ts), one account per organization and environment.

   A fixture per status, by organization:
     Sandbox:     Andes Commerce none (the demo: activating turns it pending, then approved
                  APPROVED_AFTER_MS later), Salta Labs pending, Puna Market in review
     Production:  Andes Commerce approved, Salta Labs rejected (trying again starts over, as
                  the demo), Puna Market approved
   Any other organization starts with none. The verification link is a placeholder page: in mock
   mode nothing is verified. Kept on globalThis (mockStore): a hot reload keeps it, a restart
   resets it. */
import { mockStore } from "@/lib/mock/store";
import { cuid, hoursAgo } from "@/lib/mock/fixtures";
import type { MockEnv } from "@/lib/mock/http";
import type { TransferAccount, TransferAccountBody, TransferAccountStatus, TransferAccountType } from "@/lib/transfer-account";

/** After activating, how long until the mock approves the account. */
export const APPROVED_AFTER_MS = 20_000;
const VERIFY_BASE = "https://verify.example.com/onboarding/";

interface MockAccount {
  status: TransferAccountStatus;
  type: TransferAccountType | null;
  name: string | null;
  reason: string | null;
  alias: string | null;
  cvu: string | null;
  bank: string | null;
  updatedAt: string | null;
  /** Mock only: the verification process, and when the mock approves it. */
  kybId: string | null;
  approveAt: number | null;
}

/** A CVU with valid check digits, from a label: 22 digits as Argentine banks check them. */
export function mockCvu(label: string): string {
  let n = 0;
  for (const ch of label) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const body2 = `${String(n).padStart(10, "0")}${String((n * 7) >>> 0).padStart(3, "0")}`.slice(0, 13);
  const check = (body: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * weights[i % 4];
    return String((10 - (sum % 10)) % 10);
  };
  const block1 = "0000003";
  const w = [3, 1, 7, 9];
  return `${block1}${check(block1, w)}${body2}${check(body2, w)}`;
}

const none = (): MockAccount => ({ status: "none", type: null, name: null, reason: null, alias: null, cvu: null, bank: null, updatedAt: null, kybId: null, approveAt: null });

function approved(org: string, name: string, type: TransferAccountType, alias: string): MockAccount {
  return { status: "approved", type, name, reason: null, alias, cvu: mockCvu(`${org}:${alias}`), bank: null, updatedAt: hoursAgo(72), kybId: cuid(`kyb:${org}`), approveAt: null };
}

function seed(): Record<string, MockAccount> {
  return {
    "dev:org_mock_andes": none(),
    "dev:org_mock_salta": { ...none(), status: "pending", type: "company", name: "Salta Labs S.A.", updatedAt: hoursAgo(1), kybId: cuid("kyb:salta:dev") },
    "dev:org_mock_puna": { ...none(), status: "in_review", type: "person", name: "Lucía Mamaní", updatedAt: hoursAgo(5), kybId: cuid("kyb:puna:dev") },
    "prod:org_mock_andes": approved("org_mock_andes", "Andes Commerce S.R.L.", "company", "andes.cobros"),
    "prod:org_mock_salta": {
      ...none(), status: "rejected", type: "company", name: "Salta Labs S.A.", updatedAt: hoursAgo(30), kybId: cuid("kyb:salta:prod"),
      reason: "The company registration document could not be read.",
    },
    "prod:org_mock_puna": approved("org_mock_puna", "Lucía Mamaní", "person", "puna.market"),
  };
}

const accounts = () => mockStore("transfer-accounts", seed);
const keyOf = (env: MockEnv, org: string | null) => `${env}:${org ?? "org_mock_andes"}`;

/* The account with the mock's verification applied: pending turns approved once its time comes,
   with its alias and CVU, as the provider's approval webhook would. */
function settle(a: MockAccount, org: string, now = Date.now()): MockAccount {
  if ((a.status === "pending" || a.status === "in_review") && a.approveAt !== null && now >= a.approveAt) {
    const alias = `${(a.name ?? "cobros").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 14)}.qr`;
    a.status = "approved";
    a.alias = alias.length >= 6 ? alias : "cobros.qr";
    a.cvu = mockCvu(`${org}:${a.alias}`);
    a.updatedAt = new Date(a.approveAt).toISOString();
    a.approveAt = null;
  }
  return a;
}

/** The TransferAccount the server answers. */
function view(a: MockAccount): TransferAccount {
  const waiting = a.status === "pending" || a.status === "in_review";
  return {
    status: a.status,
    type: a.type,
    name: a.name,
    verificationUrl: waiting && a.kybId ? `${VERIFY_BASE}${a.kybId}` : null,
    reason: a.status === "rejected" ? a.reason : null,
    alias: a.status === "approved" ? a.alias : null,
    cvu: a.status === "approved" ? a.cvu : null,
    bank: a.status === "approved" ? a.bank : null,
    updatedAt: a.updatedAt,
  };
}

/** The organization's account in this environment. */
export function getTransferAccount(env: MockEnv, org: string | null, now = Date.now()): TransferAccount {
  const all = accounts();
  const key = keyOf(env, org);
  all[key] ??= none();
  return view(settle(all[key], org ?? "org_mock_andes", now));
}

/** Whether a charge this organization creates takes bank transfers (its account is approved). */
export function transferAccountApproved(env: MockEnv, org: string | null, now = Date.now()): boolean {
  return getTransferAccount(env, org, now).status === "approved";
}

/** Activating: pending with its verification form, approved APPROVED_AFTER_MS later. Refused
    while an account exists that was not rejected. */
export function startTransferAccount(env: MockEnv, org: string | null, body: TransferAccountBody, now = Date.now()): { account: TransferAccount } | { error: "account_exists" } {
  const all = accounts();
  const key = keyOf(env, org);
  const current = getTransferAccount(env, org, now);
  if (current.status !== "none" && current.status !== "rejected") return { error: "account_exists" };
  all[key] = {
    ...none(),
    status: "pending",
    type: body.type,
    name: body.name,
    updatedAt: new Date(now).toISOString(),
    kybId: cuid(`kyb:${key}:${now}`),
    approveAt: now + APPROVED_AFTER_MS,
  };
  return { account: view(all[key]) };
}
