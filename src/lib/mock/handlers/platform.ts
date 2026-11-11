/* Mock answers for what the platform keeps in its own database (Prisma) or in APISIX: the
   organizations with their team, invitations and wallets, the account's profile and plan, API
   keys, notifications, support tickets, the admin's user list and the shared public key, plus
   Better Auth's session endpoints. The pages read the same state through `mockBoot()`, so the
   first render and the API agree. */
import { randomBytes } from "node:crypto";
import { ORG_PERMISSIONS } from "@/lib/org-permissions";
import { ALL_PLAN_IDS, PLAN_IDS, planLimits, type PlanId } from "@/lib/plans";
import { PLAN_STATUSES, type PlanStatus } from "@/lib/plan-status";
import { selfServicePlanIds } from "@/lib/plan-change";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support-status";
import { COSMOS_SCOPES } from "@/lib/cosmos-scopes";
import type { Chain } from "@/lib/chains";
import {
  badRequest,
  conflict,
  created,
  forbidden,
  notFound,
  ok,
  rawJson,
  route,
  str,
  type MockRequest,
  type MockRoute,
} from "@/lib/mock/http";
import { mockOptions, type MockOptions } from "@/lib/mock/mode";
import { mockStore } from "@/lib/mock/store";
import { MOCK_SIGNED_OUT_COOKIE, MOCK_USER, mockAuthSession, mockAuthUser } from "@/lib/mock/session";
import { MOCK_ORG_SEEDS, mockOrgWalletSeeds } from "@/lib/mock/shared";
import { PEOPLE, cuid, daysAgo, emailFor, hoursAgo, nowIso, rng, uuid } from "@/lib/mock/fixtures";

/* --- State --- */

type OrgRole = "owner" | "admin" | "member";

interface MemberRec {
  userId: string;
  role: OrgRole;
  permissions: string[];
  name: string | null;
  email: string | null;
  image: string | null;
  joinedAt: string;
}

interface InvitationRec {
  id: string;
  email: string;
  role: "admin" | "member";
  permissions: string[];
  expiresAt: string;
  createdAt: string;
}

interface WalletRec {
  id: string;
  chain: Chain;
  address: string;
  label: string | null;
  provider: string | null;
  createdAt: string;
}

interface OrgRec {
  id: string;
  name: string;
  ownerId: string;
  /** The owner's plan and standing (the organization's plan is its owner's subscription). */
  ownerPlan: PlanId | null;
  ownerPlanStatus: PlanStatus;
  createdAt: string;
  members: MemberRec[];
  invitations: InvitationRec[];
  wallets: WalletRec[];
}

interface ProfileRec {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  planStatus: PlanStatus;
}

interface ApiKeyRec {
  id: string;
  org: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  role: "admin" | "user";
  environment: "dev" | "prod";
  name?: string;
  description?: string;
}

interface NotificationRec {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  origin: string | null;
  country: string | null;
  region: string | null;
  ipAddress: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface MessageRec {
  id: string;
  ticketId: string;
  userId: string;
  senderId: string;
  senderName: string | null;
  fromStaff: boolean;
  body: string;
  readByUser: boolean;
  readByStaff: boolean;
  readByUserAt: string | null;
  readByStaffAt: string | null;
  createdAt: string;
}

interface TicketRec {
  id: string;
  userId: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageRec[];
}

interface UserRec {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  role: string;
  plan: string;
  planStatus: PlanStatus;
  lastSeenAt: string | null;
}

interface PlatformState {
  profile: ProfileRec;
  orgs: OrgRec[];
  apiKeys: ApiKeyRec[];
  notifications: NotificationRec[];
  tickets: TicketRec[];
  users: UserRec[];
  /** Invitations addressed to the sample account (shown in its own dashboard). */
  myInvitations: (InvitationRec & { orgId: string; orgName: string })[];
}

/* Other people on the team and in the admin's user list. */
const TEAM = PEOPLE.slice(0, 6).map((name, i) => ({
  userId: `mock-user-${String(i + 2).padStart(4, "0")}`,
  name,
  email: emailFor(`${["andes", "salta", "puna"][i % 3]}dev`, name.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()),
}));

const MEMBER_PERMS = ["payments:create", "payments:edit", "customers:create", "customers:edit", "products:create", "apiKeysTest:create", "webhooks:create"];

function seedState(options: MockOptions): PlatformState {
  const r = rng("platform");
  const profile: ProfileRec = { displayName: null, bio: "Building payments in Salta.", avatarUrl: null, plan: options.plan, planStatus: "active" };
  const orgs: OrgRec[] = options.fresh
    ? []
    : MOCK_ORG_SEEDS.map((seed, oi) => {
        const ownerId = seed.role === "owner" ? MOCK_USER.id : TEAM[5].userId;
        const me: MemberRec = {
          userId: MOCK_USER.id,
          role: seed.role,
          permissions: seed.role === "member" ? MEMBER_PERMS : [],
          name: MOCK_USER.name,
          email: MOCK_USER.email,
          image: MOCK_USER.image,
          joinedAt: seed.createdAt,
        };
        const others: MemberRec[] = TEAM.slice(oi, oi + 3 + oi).map((p, i) => ({
          userId: p.userId,
          role: ownerId === p.userId ? "owner" : i === 0 ? "admin" : "member",
          permissions: i === 0 ? [] : MEMBER_PERMS.slice(0, 3 + i),
          name: p.name,
          email: p.email,
          image: null,
          joinedAt: daysAgo(80 - i * 9 - oi * 5),
        }));
        const members = seed.role === "owner" ? [me, ...others] : [...others.filter((m) => m.role === "owner"), me, ...others.filter((m) => m.role !== "owner")];
        if (seed.role !== "owner" && !members.some((m) => m.role === "owner")) {
          members.unshift({ userId: TEAM[5].userId, role: "owner", permissions: [], name: TEAM[5].name, email: TEAM[5].email, image: null, joinedAt: seed.createdAt });
        }
        return {
          id: seed.id,
          name: seed.name,
          ownerId,
          ownerPlan: seed.role === "owner" ? null : "essentials",
          ownerPlanStatus: "active",
          createdAt: seed.createdAt,
          members,
          invitations:
            oi === 0
              ? [
                  { id: cuid(`inv:${seed.id}:1`), email: "nuevo@andes.dev", role: "member", permissions: MEMBER_PERMS.slice(0, 2), expiresAt: daysAgo(-5), createdAt: daysAgo(2) },
                  { id: cuid(`inv:${seed.id}:2`), email: "finanzas@andes.dev", role: "admin", permissions: [], expiresAt: daysAgo(-6), createdAt: daysAgo(1) },
                ]
              : [],
          wallets: mockOrgWalletSeeds(seed.id).map(({ orgId: _orgId, ...w }) => w),
        };
      });

  const apiKeys: ApiKeyRec[] = [];
  for (const org of orgs) {
    const names = ["Backend server", "Checkout worker", "Staging", "Reporting job", "Mobile app"];
    const count = org.id === MOCK_ORG_SEEDS[0].id ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const at = daysAgo(150 - i * 23);
      apiKeys.push({
        id: `cosmos_${uuid(`key:${org.id}:${i}`)}`,
        org: org.id,
        createdAt: at,
        updatedAt: i === 1 ? daysAgo(3) : at,
        permissions: i === 0 ? [...COSMOS_SCOPES] : COSMOS_SCOPES.filter((_, j) => (j + i) % 3 !== 0),
        role: "user",
        environment: i % 2 === 0 ? "dev" : "prod",
        name: names[i],
        description: i === 0 ? "Creates payment links from the store" : undefined,
      });
    }
  }

  const notifTypes: [string, string, (i: number) => string, (i: number) => Record<string, unknown>][] = [
    ["auth.login", "New sign-in", () => "Signed in from Chrome on Windows", () => ({ city: "Salta", publicIp: "190.12.34.56", userAgent: "Chrome on Windows", local: false })],
    ["apikey.created", "API key created", (i) => `Created “${["Backend server", "Staging", "Reporting job"][i % 3]}”`, (i) => ({ id: apiKeys[i % Math.max(1, apiKeys.length)]?.id ?? null, environment: i % 2 ? "prod" : "dev", role: "user" })],
    ["apikey.updated", "API key updated", () => "Updated “Checkout worker”", () => ({ id: apiKeys[1]?.id ?? null })],
    ["support.reply", "New support reply", () => "We enabled production keys on your account.", () => ({ ticketId: cuid("ticket:0") })],
    ["apikey.deleted", "API key revoked", () => "Revoked key cosmos_6f1c...", () => ({ id: "cosmos_6f1c0000-0000-4000-a000-000000000000" })],
    ["custom", "Scheduled maintenance", () => "The sandbox restarts on Sunday at 03:00 UTC.", () => ({})],
  ];
  const notifications: NotificationRec[] = Array.from({ length: 28 }, (_, i) => {
    const [type, title, message, metadata] = notifTypes[i % notifTypes.length];
    return {
      id: cuid(`notif:${i}`),
      userId: MOCK_USER.id,
      type,
      title,
      message: message(i),
      origin: type === "auth.login" ? "Salta, AR" : null,
      country: type === "auth.login" ? "AR" : null,
      region: type === "auth.login" ? "Salta" : null,
      ipAddress: type === "auth.login" ? "190.12.34.56" : null,
      read: i > 3,
      metadata: metadata(i),
      createdAt: hoursAgo(i * 9 + r.int(0, 5)),
    };
  });

  const subjects = [
    "Production keys for Andes Commerce",
    "Webhook deliveries failing with 500",
    "How do I set a merchant fee?",
    "Monad payment not confirmed",
    "Invoice for October",
    "Swap stuck in pending",
    "Add a second Stellar wallet",
    "Private payments on mainnet",
  ];
  const tickets: TicketRec[] = subjects.map((subject, i) => {
    const id = cuid(`ticket:${i}`);
    const owner = i % 3 === 2 ? TEAM[i % TEAM.length] : { userId: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email };
    const createdAt = daysAgo(20 - i * 2);
    const thread = [
      { fromStaff: false, body: `Hi, ${subject.toLowerCase()}. Can you help?` },
      { fromStaff: true, body: "Thanks for writing. We are looking into it and will get back to you shortly." },
      ...(i % 2 === 0 ? [{ fromStaff: false, body: "Great, thank you. Here is the payment id: 3f9a2c1e." }] : []),
      ...(i % 4 === 0 ? [{ fromStaff: true, body: "Done. It should work now, let us know if it does not." }] : []),
    ];
    const messages: MessageRec[] = thread.map((m, j) => {
      const at = hoursAgo((20 - i * 2) * 24 - j * 5);
      const last = j === thread.length - 1;
      return {
        id: cuid(`msg:${i}:${j}`),
        ticketId: id,
        userId: owner.userId,
        senderId: m.fromStaff ? "mock-user-staff" : owner.userId,
        senderName: m.fromStaff ? "Cosmos Pay support" : owner.name,
        fromStaff: m.fromStaff,
        body: m.body,
        readByUser: !(m.fromStaff && last && i % 2 === 0),
        readByStaff: !(!m.fromStaff && last && i % 3 !== 1),
        readByUserAt: m.fromStaff ? at : null,
        readByStaffAt: m.fromStaff ? null : at,
        createdAt: at,
      };
    });
    return {
      id,
      userId: owner.userId,
      subject,
      status: TICKET_STATUSES[i % TICKET_STATUSES.length],
      priority: TICKET_PRIORITIES[(i * 3) % TICKET_PRIORITIES.length],
      createdAt,
      updatedAt: messages[messages.length - 1].createdAt,
      messages,
    };
  });

  const users: UserRec[] = [
    { id: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email, image: null, createdAt: daysAgo(240), role: options.role, plan: options.plan, planStatus: "active", lastSeenAt: nowIso() },
    ...TEAM.map((p, i) => ({
      id: p.userId,
      name: p.name,
      email: p.email,
      image: null,
      createdAt: daysAgo(200 - i * 17),
      role: i === 0 ? "admin" : i === 1 ? "support" : "user",
      plan: ALL_PLAN_IDS[i % ALL_PLAN_IDS.length],
      planStatus: PLAN_STATUSES[i % PLAN_STATUSES.length],
      lastSeenAt: i === 4 ? null : hoursAgo(i * 13 + 1),
    })),
    ...Array.from({ length: 14 }, (_, i) => {
      const name = `Developer ${i + 1}`;
      return {
        id: `mock-user-${String(i + 20).padStart(4, "0")}`,
        name,
        email: `dev${i + 1}@example.com`,
        image: null,
        createdAt: daysAgo(120 - i * 7),
        role: "user",
        plan: PLAN_IDS[i % PLAN_IDS.length],
        planStatus: "active" as PlanStatus,
        lastSeenAt: i % 3 === 0 ? null : hoursAgo(i * 30),
      };
    }),
  ];

  const myInvitations = options.fresh
    ? []
    : [{ id: cuid("inv:mine:1"), email: MOCK_USER.email, role: "member" as const, permissions: MEMBER_PERMS.slice(0, 2), expiresAt: daysAgo(-4), createdAt: hoursAgo(6), orgId: "org_mock_cafayate", orgName: "Cafayate Wines" }];

  return { profile, orgs, apiKeys, notifications, tickets, users, myInvitations };
}

function state(): PlatformState {
  return mockStore("platform", () => seedState(mockOptions()));
}

/* --- Views of the state, in the shapes the real routes answer --- */

function orgPlan(org: OrgRec): PlanId {
  return org.ownerPlan ?? state().profile.plan;
}

/** The plan an organization's swaps are charged by: its owner's, as orgSwapContext reads it (the
    sample account's, as Settings last set it, when the organization is unknown). */
export function mockOrgPlan(orgId: string | null | undefined): PlanId {
  const org = orgId ? state().orgs.find((o) => o.id === orgId) : undefined;
  return org ? orgPlan(org) : state().profile.plan;
}

function orgPlanStatus(org: OrgRec): PlanStatus {
  return org.ownerPlan ? org.ownerPlanStatus : state().profile.planStatus;
}

function myMembership(org: OrgRec): MemberRec | undefined {
  return org.members.find((m) => m.userId === MOCK_USER.id);
}

function orgSummary(org: OrgRec) {
  const me = myMembership(org);
  return {
    id: org.id,
    name: org.name,
    role: me?.role ?? "member",
    ownerId: org.ownerId,
    createdAt: org.createdAt,
    permissions: me?.permissions ?? [],
    plan: orgPlan(org),
    planStatus: orgPlanStatus(org),
  };
}

function findOrg(id: string): OrgRec | undefined {
  return state().orgs.find((o) => o.id === id && myMembership(o));
}

function canManage(org: OrgRec): boolean {
  const role = myMembership(org)?.role;
  return role === "owner" || role === "admin";
}

function hasPermission(org: OrgRec, permission: string): boolean {
  const me = myMembership(org);
  if (!me) return false;
  return me.role === "owner" || me.role === "admin" || me.permissions.includes(permission);
}

function isStaff(options: MockOptions): boolean {
  return options.role === "owner" || options.role === "admin" || options.role === "support";
}

function isManager(options: MockOptions): boolean {
  return options.role === "owner" || options.role === "admin";
}

function ticketSummary(t: TicketRec, asStaff: boolean) {
  const last = t.messages[t.messages.length - 1];
  const unread = t.messages.filter((m) => (asStaff ? !m.fromStaff && !m.readByStaff : m.fromStaff && !m.readByUser)).length;
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastMessage: last?.body ?? "",
    lastFromStaff: last?.fromStaff ?? false,
    lastAt: last?.createdAt ?? t.updatedAt,
    unread,
  };
}

function notify(type: string, title: string, message: string, metadata: Record<string, unknown> = {}): void {
  state().notifications.unshift({
    id: cuid(`notif:${Date.now()}:${Math.random()}`),
    userId: MOCK_USER.id,
    type,
    title,
    message,
    origin: "Salta, AR",
    country: "AR",
    region: "Salta",
    ipAddress: "127.0.0.1",
    read: false,
    metadata: { city: "Salta", publicIp: "190.12.34.56", userAgent: "mock", local: true, ...metadata },
    createdAt: nowIso(),
  });
}

/* --- What the pages read on the server (dashboard.astro, onboarding.astro) --- */

export function mockBoot() {
  const s = state();
  const options = mockOptions();
  return {
    // As listForUser answers them (createdAt a Date), so the pages handle both the same way.
    orgs: s.orgs.filter(myMembership).map((o) => ({ ...orgSummary(o), createdAt: new Date(o.createdAt) })),
    profile: { ...s.profile },
    role: options.role,
  };
}

/** With onboarding switched off, the dashboard gives a new account a default organization. */
export function mockEnsureDefaultOrg(displayName: string | null | undefined) {
  if (!state().orgs.some(myMembership)) createOrgRec(`${displayName || "My"} organization`);
  return mockBoot().orgs;
}

/** The invitation page's state for a magic link. Any token works: `expired`, `accepted`,
    `mismatch`, `seat_limit` and `invalid` show those states, any other token a valid invitation. */
export function mockInvite(token: string, signedIn: boolean): { state: string; org: string; email: string } {
  const org = "Cafayate Wines";
  const email = MOCK_USER.email;
  if (token === "invalid") return { state: "invalid", org: "", email: "" };
  if (token === "expired" || token === "accepted") return { state: token, org, email };
  if (!signedIn) return { state: "needsLogin", org, email };
  if (token === "mismatch") return { state: "mismatch", org, email: "someone.else@example.com" };
  if (token === "seat_limit") return { state: "seat_limit", org, email };
  return { state: "success", org, email };
}

/** Creates the organization (the onboarding's and the dashboard's create). */
function createOrgRec(name: string): OrgRec {
  const id = `org_${cuid(`org:${name}:${Date.now()}`).slice(1, 13)}`;
  const org: OrgRec = {
    id,
    name,
    ownerId: MOCK_USER.id,
    ownerPlan: null,
    ownerPlanStatus: "active",
    createdAt: nowIso(),
    members: [{ userId: MOCK_USER.id, role: "owner", permissions: [], name: MOCK_USER.name, email: MOCK_USER.email, image: MOCK_USER.image, joinedAt: nowIso() }],
    invitations: [],
    wallets: [],
  };
  state().orgs.push(org);
  return org;
}

/* --- Routes --- */

const orgRoutes: MockRoute[] = [
  route("GET", "/api/organizations", () => ok(state().orgs.filter(myMembership).map(orgSummary), "Organizations loaded")),
  route("POST", "/api/organizations", (req) => {
    const name = str(req.body, "name")?.trim();
    if (!name || name.length > 60) return badRequest();
    const owned = state().orgs.filter((o) => o.ownerId === MOCK_USER.id).length;
    const max = planLimits(state().profile.plan).maxOrgs;
    if (max != null && owned >= max) return forbidden("You have reached your plan's organization limit. Upgrade to create more.");
    return created(orgSummary(createOrgRec(name)), "Organization created");
  }),
  route("GET", "/api/organizations/:id", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    return ok({ id: org.id, role: myMembership(org)?.role }, "Organization loaded");
  }),
  route("PATCH", "/api/organizations/:id", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!canManage(org)) return forbidden("You can't manage this organization");
    const name = str(req.body, "name")?.trim();
    if (!name || name.length > 60) return badRequest();
    org.name = name;
    return ok({ id: org.id, name: org.name }, "Organization updated");
  }),
  route("DELETE", "/api/organizations/:id", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (myMembership(org)?.role !== "owner") return forbidden("Only the owner can delete this organization");
    const s = state();
    if (s.orgs.filter(myMembership).length <= 1) return forbidden("You must keep at least one organization");
    s.orgs = s.orgs.filter((o) => o.id !== org.id);
    return ok(null, "Organization deleted");
  }),

  route("GET", "/api/organizations/:id/members", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    return ok(org.members, "Members loaded");
  }),
  route("PATCH", "/api/organizations/:id/members/:userId", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!canManage(org)) return forbidden("You can't manage this organization");
    const target = org.members.find((m) => m.userId === req.params.userId);
    if (!target) return notFound("Member not found");
    if (target.role === "owner") return forbidden("The organization owner can't be changed");
    const role = str(req.body, "role");
    if (role === "admin" || role === "member") target.role = role;
    const perms = req.body?.permissions;
    if (Array.isArray(perms)) target.permissions = perms.filter((p): p is string => typeof p === "string" && (ORG_PERMISSIONS as string[]).includes(p));
    if (target.role === "admin") target.permissions = [];
    return ok({ userId: target.userId, role: target.role, permissions: target.permissions }, "Member updated");
  }),
  route("DELETE", "/api/organizations/:id/members/:userId", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!canManage(org)) return forbidden("You can't manage this organization");
    const target = org.members.find((m) => m.userId === req.params.userId);
    if (!target) return notFound("Member not found");
    if (target.role === "owner") return forbidden("The organization owner can't be removed");
    org.members = org.members.filter((m) => m.userId !== target.userId);
    return ok(null, "Member removed");
  }),

  route("GET", "/api/organizations/:id/invitations", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!canManage(org)) return forbidden("You can't manage this organization");
    return ok(org.invitations, "Invitations loaded");
  }),
  route("POST", "/api/organizations/:id/invitations", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!canManage(org)) return forbidden("You can't manage this organization");
    const email = str(req.body, "email")?.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest();
    if (org.members.some((m) => m.email?.toLowerCase() === email)) return conflict("That person is already a member");
    if (org.invitations.some((i) => i.email === email)) return conflict("An invitation is already pending for that email");
    const seats = planLimits(orgPlan(org)).maxSeats;
    if (seats != null && org.members.length + org.invitations.length >= seats) return conflict("This organization has reached its plan's seat limit");
    const role = str(req.body, "role") === "admin" ? "admin" : "member";
    const perms = Array.isArray(req.body?.permissions) ? (req.body.permissions as unknown[]).filter((p): p is string => typeof p === "string") : [];
    const inv: InvitationRec = { id: cuid(`inv:${email}:${Date.now()}`), email, role, permissions: role === "admin" ? [] : perms, expiresAt: daysAgo(-7), createdAt: nowIso() };
    org.invitations.unshift(inv);
    return created(inv, "Invitation sent");
  }),
  route("DELETE", "/api/organizations/:id/invitations/:invId", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!canManage(org)) return forbidden("You can't manage this organization");
    const before = org.invitations.length;
    org.invitations = org.invitations.filter((i) => i.id !== req.params.invId);
    if (org.invitations.length === before) return notFound("Invitation not found");
    return ok({ id: req.params.invId }, "Invitation revoked");
  }),

  route("GET", "/api/organizations/:id/wallets", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    return ok(org.wallets, "Wallets loaded");
  }),
  // The real route checks the wallet's signature; the mock takes any proof, so the form can be
  // walked through without a wallet extension.
  route("POST", "/api/organizations/:id/wallets", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!hasPermission(org, "wallets:create")) return forbidden("You don't have permission to connect wallets to this organization.");
    const chain = str(req.body, "chain") as Chain | undefined;
    const address = str(req.body, "address")?.trim();
    if (!chain || !["stellar", "solana", "monad"].includes(chain) || !address) return badRequest();
    const normalized = chain === "monad" ? address.toLowerCase() : address;
    if (org.wallets.some((w) => w.chain === chain && (chain === "monad" ? w.address.toLowerCase() : w.address) === normalized)) {
      return conflict("This wallet is already connected to the organization.");
    }
    const wallet: WalletRec = {
      id: uuid(`wallet:${org.id}:${chain}:${normalized}`),
      chain,
      address: normalized,
      label: str(req.body, "label")?.trim() || null,
      provider: str(req.body, "provider") ?? null,
      createdAt: nowIso(),
    };
    org.wallets.push(wallet);
    return created(wallet, "Wallet connected");
  }),
  route("PATCH", "/api/organizations/:id/wallets/:walletId", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!hasPermission(org, "wallets:edit")) return forbidden("You don't have permission to rename this organization's wallets.");
    const wallet = org.wallets.find((w) => w.id === req.params.walletId);
    if (!wallet) return notFound("Wallet not found");
    wallet.label = str(req.body, "label")?.trim() || null;
    return ok(wallet, "Wallet renamed");
  }),
  route("DELETE", "/api/organizations/:id/wallets/:walletId", (req) => {
    const org = findOrg(req.params.id);
    if (!org) return notFound("Organization not found");
    if (!hasPermission(org, "wallets:delete")) return forbidden("You don't have permission to remove this organization's wallets.");
    const before = org.wallets.length;
    org.wallets = org.wallets.filter((w) => w.id !== req.params.walletId);
    if (org.wallets.length === before) return notFound("Wallet not found");
    return ok(null, "Wallet removed");
  }),
];

const accountRoutes: MockRoute[] = [
  route("PATCH", "/api/account/plan", (req) => {
    const plan = str(req.body, "plan");
    if (!plan || !(PLAN_IDS as string[]).includes(plan)) return badRequest("Unknown plan");
    // As the server: an account puts itself only on a plan with no fee to bill (src/lib/plan-change.ts).
    if (!selfServicePlanIds(PLAN_IDS, mockOptions().role).includes(plan as PlanId)) {
      return forbidden("That plan has a fee, so our team sets it up. Write to us from Support.");
    }
    state().profile.plan = plan as PlanId;
    const me = state().users.find((u) => u.id === MOCK_USER.id);
    if (me) me.plan = plan;
    return ok({ plan }, "Plan updated");
  }),
  route("PATCH", "/api/account/profile", (req) => {
    const p = state().profile;
    const b = req.body ?? {};
    const text = (v: unknown, max: number) => (v === null || v === "" ? null : typeof v === "string" ? v.trim().slice(0, max) || null : undefined);
    const displayName = text(b.displayName, 60);
    const bio = text(b.bio, 280);
    if (displayName !== undefined) p.displayName = displayName;
    if (bio !== undefined) p.bio = bio;
    if (b.avatarUrl !== undefined) {
      if (b.avatarUrl === "" || b.avatarUrl === null) p.avatarUrl = null;
      else if (typeof b.avatarUrl === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(b.avatarUrl)) p.avatarUrl = b.avatarUrl;
      else return badRequest("The avatar must be a PNG, JPEG or WebP image");
    }
    return ok({ displayName: p.displayName, bio: p.bio, avatarUrl: p.avatarUrl }, "Profile updated");
  }),
];

const apiKeyView = (k: ApiKeyRec) => ({
  id: k.id,
  createdAt: k.createdAt,
  updatedAt: k.updatedAt,
  permissions: k.permissions,
  role: k.role,
  environment: k.environment,
  name: k.name,
  description: k.description,
});

/* The request bodies take no role but the deprecated `"user"`; anything else is the server's 400. */
const roleAccepted = (body: Record<string, unknown> | null | undefined) =>
  body?.role === undefined || body.role === "user";

const apiKeyRoutes: MockRoute[] = [
  route("GET", "/api/api-keys", (req) => {
    const org = req.url.searchParams.get("org");
    if (org && !findOrg(org)) return forbidden("You are not a member of this organization.");
    const keys = state().apiKeys.filter((k) => !org || k.org === org);
    return ok(keys.map(apiKeyView), "API keys fetched successfully");
  }),
  route("POST", "/api/api-keys", (req) => {
    const orgId = str(req.body, "org");
    const environment = str(req.body, "environment") === "prod" ? "prod" : "dev";
    const permissions = Array.isArray(req.body?.permissions) ? (req.body.permissions as unknown[]).filter((p): p is string => typeof p === "string") : [];
    // Like the server: a key's role is never the caller's (src/lib/api-key-role.ts).
    if (!orgId || permissions.length === 0 || !roleAccepted(req.body)) return badRequest();
    const org = findOrg(orgId);
    if (!org) return forbidden("You are not a member of this organization.");
    if (!hasPermission(org, `${environment === "prod" ? "apiKeysLive" : "apiKeysTest"}:create`)) {
      return forbidden("You don't have permission to create this kind of API key in this organization.");
    }
    const limits = planLimits(orgPlan(org));
    if (environment === "prod" && !limits.allowLive) return forbidden("Your plan does not allow production (live) API keys. Upgrade to create one.");
    const count = state().apiKeys.filter((k) => k.org === org.id).length;
    if (limits.maxApiKeys != null && count >= limits.maxApiKeys) {
      return forbidden("You have reached your plan's API key limit for this organization. Upgrade to create more.");
    }
    const at = nowIso();
    const key: ApiKeyRec = {
      id: `cosmos_${uuid(`key:${org.id}:${at}:${Math.random()}`)}`,
      org: org.id,
      createdAt: at,
      updatedAt: at,
      permissions,
      role: "user",
      environment,
      name: str(req.body, "name")?.trim() || undefined,
      description: str(req.body, "description")?.trim() || undefined,
    };
    state().apiKeys.push(key);
    notify("apikey.created", "API key created", key.name ? `Created “${key.name}”` : `Created key ${key.id}`, { id: key.id, environment, role: key.role });
    return created(
      { username: `cosmos_${MOCK_USER.id}`, apiKey: `${environment === "prod" ? "prod" : "dv"}_${randomBytes(24).toString("hex")}`, ...apiKeyView(key) },
      "API key created successfully",
    );
  }),
  route("GET", "/api/api-keys/:id", (req) => {
    const key = state().apiKeys.find((k) => k.id === req.params.id);
    return key ? ok(apiKeyView(key), "API key fetched successfully") : notFound("API key not found");
  }),
  route("PATCH", "/api/api-keys/:id", (req) => {
    const key = state().apiKeys.find((k) => k.id === req.params.id);
    if (!key) return notFound("API key not found");
    const permissions = Array.isArray(req.body?.permissions) ? (req.body.permissions as unknown[]).filter((p): p is string => typeof p === "string") : null;
    if (!permissions || permissions.length === 0 || !roleAccepted(req.body)) return badRequest();
    key.permissions = permissions;
    key.role = "user";
    if (req.body && "name" in req.body) key.name = str(req.body, "name")?.trim() || undefined;
    if (req.body && "description" in req.body) key.description = str(req.body, "description")?.trim() || undefined;
    key.updatedAt = nowIso();
    notify("apikey.updated", "API key updated", key.name ? `Updated “${key.name}”` : `Updated key ${key.id}`, { id: key.id });
    return ok(apiKeyView(key), "API key updated successfully");
  }),
  route("DELETE", "/api/api-keys/:id", (req) => {
    const s = state();
    const key = s.apiKeys.find((k) => k.id === req.params.id);
    if (!key) return notFound("API key not found");
    s.apiKeys = s.apiKeys.filter((k) => k.id !== key.id);
    notify("apikey.deleted", "API key revoked", key.name ? `Revoked “${key.name}”` : `Revoked key ${key.id}`, { id: key.id });
    return ok(null, "API key deleted successfully");
  }),
];

const notificationRoutes: MockRoute[] = [
  route("GET", "/api/notifications", () => ok(state().notifications.slice(0, 50), "Notifications fetched successfully")),
  route("POST", "/api/notifications", (req) => {
    if (!isManager(req.options)) return forbidden("Only owners and admins can create notifications");
    const title = str(req.body, "title")?.trim();
    if (!title) return badRequest();
    notify(str(req.body, "type") || "custom", title, str(req.body, "message") ?? "");
    return created(state().notifications[0], "Notification created successfully");
  }),
  route("POST", "/api/notifications/read", () => {
    let updated = 0;
    for (const n of state().notifications) if (!n.read) { n.read = true; updated++; }
    return ok({ updated }, "Notifications marked read");
  }),
];

function ticketFor(req: MockRequest): TicketRec | Response {
  const t = state().tickets.find((x) => x.id === req.params.id);
  if (!t) return notFound("Ticket not found");
  if (t.userId !== MOCK_USER.id && !isStaff(req.options)) return forbidden("You can't access this ticket");
  return t;
}

const supportRoutes: MockRoute[] = [
  route("GET", "/api/support/tickets", () =>
    ok(state().tickets.filter((t) => t.userId === MOCK_USER.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((t) => ticketSummary(t, false)), "Tickets loaded"),
  ),
  route("POST", "/api/support/tickets", (req) => {
    const subject = str(req.body, "subject")?.trim();
    const body = str(req.body, "body")?.trim();
    if (!subject || !body) return badRequest();
    const at = nowIso();
    const id = cuid(`ticket:${at}:${Math.random()}`);
    state().tickets.unshift({
      id,
      userId: MOCK_USER.id,
      subject: subject.slice(0, 140),
      status: "open",
      priority: "normal",
      createdAt: at,
      updatedAt: at,
      messages: [{ id: cuid(`msg:${id}:0`), ticketId: id, userId: MOCK_USER.id, senderId: MOCK_USER.id, senderName: MOCK_USER.name, fromStaff: false, body, readByUser: true, readByStaff: false, readByUserAt: null, readByStaffAt: null, createdAt: at }],
    });
    return created({ id, subject, status: "open" }, "Ticket opened");
  }),
  route("GET", "/api/support/tickets/:id", (req) => {
    const t = ticketFor(req);
    if (t instanceof Response) return t;
    const staff = isStaff(req.options) && t.userId !== MOCK_USER.id;
    const at = nowIso();
    for (const m of t.messages) {
      if (staff && !m.fromStaff && !m.readByStaff) { m.readByStaff = true; m.readByStaffAt = at; }
      if (!staff && m.fromStaff && !m.readByUser) { m.readByUser = true; m.readByUserAt = at; }
    }
    return ok({ id: t.id, subject: t.subject, status: t.status, priority: t.priority, messages: t.messages }, "Ticket loaded");
  }),
  route("POST", "/api/support/tickets/:id", (req) => {
    const t = ticketFor(req);
    if (t instanceof Response) return t;
    const body = str(req.body, "body")?.trim();
    if (!body) return badRequest();
    const fromStaff = isStaff(req.options) && t.userId !== MOCK_USER.id;
    const at = nowIso();
    const msg: MessageRec = {
      id: cuid(`msg:${t.id}:${at}`),
      ticketId: t.id,
      userId: t.userId,
      senderId: MOCK_USER.id,
      senderName: MOCK_USER.name,
      fromStaff,
      body,
      readByUser: !fromStaff,
      readByStaff: fromStaff,
      readByUserAt: null,
      readByStaffAt: null,
      createdAt: at,
    };
    t.messages.push(msg);
    if (!fromStaff && (t.status === "resolved" || t.status === "closed")) t.status = "open";
    if (fromStaff && t.status === "open") t.status = "pending";
    t.updatedAt = at;
    return created(msg, "Message sent");
  }),
  route("PATCH", "/api/support/tickets/:id", (req) => {
    if (!isStaff(req.options)) return forbidden("Staff only");
    const t = ticketFor(req);
    if (t instanceof Response) return t;
    const status = str(req.body, "status");
    const priority = str(req.body, "priority");
    if (status && (TICKET_STATUSES as readonly string[]).includes(status)) t.status = status;
    if (priority && (TICKET_PRIORITIES as readonly string[]).includes(priority)) t.priority = priority;
    t.updatedAt = nowIso();
    return ok({ id: t.id, status: t.status, priority: t.priority }, "Ticket updated");
  }),
  route("GET", "/api/support/unread", () => {
    const count = state().tickets.filter((t) => t.userId === MOCK_USER.id).reduce((n, t) => n + t.messages.filter((m) => m.fromStaff && !m.readByUser).length, 0);
    return ok({ count }, "OK");
  }),
  route("GET", "/api/support/admin/tickets", (req) => {
    if (!isStaff(req.options)) return forbidden("Staff only");
    const status = req.url.searchParams.get("status");
    const users = state().users;
    const rows = state()
      .tickets.filter((t) => !status || !(TICKET_STATUSES as readonly string[]).includes(status) || t.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => {
        const u = users.find((x) => x.id === t.userId);
        return {
          ...ticketSummary(t, true),
          user: { id: t.userId, name: u?.name ?? null, email: u?.email ?? null, image: null },
          lastSeen: u?.lastSeenAt ?? null,
        };
      });
    return ok(rows, "Tickets loaded");
  }),
];

const invitationRoutes: MockRoute[] = [
  route("GET", "/api/invitations", () => ok(state().myInvitations, "Invitations loaded")),
  route("POST", "/api/invitations/accept", (req) => {
    const s = state();
    const inv = s.myInvitations.find((i) => i.id === str(req.body, "id"));
    if (!inv) return notFound("Invitation not found");
    s.myInvitations = s.myInvitations.filter((i) => i.id !== inv.id);
    if (!s.orgs.some((o) => o.id === inv.orgId)) {
      s.orgs.push({
        id: inv.orgId,
        name: inv.orgName,
        ownerId: TEAM[3].userId,
        ownerPlan: "growth",
        ownerPlanStatus: "active",
        createdAt: daysAgo(60),
        members: [
          { userId: TEAM[3].userId, role: "owner", permissions: [], name: TEAM[3].name, email: TEAM[3].email, image: null, joinedAt: daysAgo(60) },
          { userId: MOCK_USER.id, role: inv.role, permissions: inv.permissions, name: MOCK_USER.name, email: MOCK_USER.email, image: null, joinedAt: nowIso() },
        ],
        invitations: [],
        wallets: mockOrgWalletSeeds(inv.orgId).map(({ orgId: _orgId, ...w }) => w),
      });
    }
    return ok({ orgId: inv.orgId, orgName: inv.orgName }, "Invitation accepted");
  }),
];

const adminRoutes: MockRoute[] = [
  route("GET", "/api/admin/users", (req) => {
    if (!isManager(req.options)) return forbidden("Admin access required");
    return ok(state().users, "Users loaded");
  }),
  route("PATCH", "/api/admin/users/:id", (req) => {
    if (!isManager(req.options)) return forbidden("Admin access required");
    const u = state().users.find((x) => x.id === req.params.id);
    if (!u) return notFound("User not found");
    const role = str(req.body, "role");
    const plan = str(req.body, "plan");
    const planStatus = str(req.body, "planStatus");
    if (role !== undefined) {
      if (!["user", "support", "admin", "owner"].includes(role)) return badRequest("Unknown role");
      if (role === "owner" && req.options.role !== "owner") return forbidden("Only an owner can make another owner");
      u.role = role;
    }
    if (plan !== undefined) {
      if (!(ALL_PLAN_IDS as string[]).includes(plan)) return badRequest("Unknown plan");
      u.plan = plan;
      if (u.id === MOCK_USER.id) state().profile.plan = plan as PlanId;
    }
    if (planStatus !== undefined) {
      if (!(PLAN_STATUSES as readonly string[]).includes(planStatus)) return badRequest("Unknown plan status");
      u.planStatus = planStatus as PlanStatus;
      if (u.id === MOCK_USER.id) state().profile.planStatus = planStatus as PlanStatus;
    }
    return ok({ userId: u.id, role: u.role, plan: u.plan, planStatus: u.planStatus }, "User updated");
  }),
  route("GET", "/api/admin/public-key", (req) => {
    if (!isManager(req.options)) return forbidden("Admin access required");
    const keys = { dev: "dv_mockpublickey0000000000000000000000000000", prod: "prod_mockpublickey000000000000000000000000000" };
    return ok({ consumer: "cosmos_public", keys, env: { APISIX_PUBLIC_CONSUMER: "cosmos_public", PUBLIC_API_KEY_DEV: keys.dev, PUBLIC_API_KEY_PROD: keys.prod } }, "Public key ready");
  }),
];

/* Better Auth's own endpoints answer without the envelope. */
const authRoutes: MockRoute[] = [
  route("GET", "/api/auth/get-session", () => rawJson({ session: mockAuthSession(), user: mockAuthUser() })),
  route("POST", "/api/auth/sign-out", () => {
    const res = rawJson({ success: true });
    res.headers.append("Set-Cookie", `${MOCK_SIGNED_OUT_COOKIE}=1; Path=/; SameSite=Lax; HttpOnly`);
    return res;
  }),
  route("GET", "/api/auth/:rest*", () => rawJson(null)),
  route("POST", "/api/auth/:rest*", () => rawJson({ success: true })),
];

export const routes: MockRoute[] = [
  ...orgRoutes,
  ...accountRoutes,
  ...apiKeyRoutes,
  ...notificationRoutes,
  ...supportRoutes,
  ...invitationRoutes,
  ...adminRoutes,
  ...authRoutes,
];
