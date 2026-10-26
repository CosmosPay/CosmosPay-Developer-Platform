/* Dashboard.jsx: Cosmos Pay developer dashboard shell. Ported from the Design bundle.
   Auth/profile are real (Authentik session passed in via props); data is mock.
   All UI copy comes from the i18n catalog (useT). */
import { useState, useEffect, useRef } from "react";
import {
  ConfirmModal, useTheme, showToast,
  startTracking, setTrackEnv, track, trackView,
} from "@/components/cosmos/shared";
import { Nav } from "@/components/cosmos/layout/Nav";
import { useT, fmt, initLang } from "@/lib/i18n/index";
import { apiKeys as apiKeysApi, notifications as notificationsApi, account as accountApi, organizations as orgsApi, invites as invitesApi, support as supportApi } from "@/lib/api-client";
import { planLimits, PLAN_IDS, ALL_PLAN_IDS, DEFAULT_PLAN_ID } from "@/lib/plans.ts";
import { effectivePermissions } from "@/lib/org-permissions.ts";
import { DI } from "@/components/cosmos/dashboard/icons";
import { STAFF_ROLES, MANAGER_ROLES, STAFF_ONLY, MANAGER_ONLY, OWNER_ONLY, DISABLED_VIEWS } from "@/components/cosmos/dashboard/data";
import {
  OverviewView, PaymentsView, ZkPaymentsView, BalancesView, CustomersView, ProductsView, SwapsView, LiquidityView, BlindPayView,
  ApiKeysView, WebhooksView, LogsView, ActivityLogView, NotificationsView, SupportView, SupportInboxView, UsersView, SettingsView, AccountView,
  AdminOverviewView, AdminPaymentsView, AdminSwapsView, AdminFiatView, AdminCustomersView, AdminProductsView, AdminConsumersView,
} from "@/components/cosmos/dashboard/views/index";
import { OrgSwitcher } from "@/components/cosmos/dashboard/widgets/OrgSwitcher";
import { Sidebar } from "@/components/cosmos/dashboard/widgets/Sidebar";
import { DashSearch } from "@/components/cosmos/dashboard/widgets/DashSearch";
import { tierOf } from "@/lib/chains";
import { DOCS } from "@/components/cosmos/lib/constants";
import { parseUsage, quickLinks, recordUse } from "@/lib/dashboard-usage";
import { CreateOrgModal, RenameOrgModal, ApiKeyModal, PlanModal, RevealKeyModal } from "@/components/cosmos/dashboard/modals/index";

/* ---------------- shell ---------------- */
export default function Dashboard({ user: initialUser, lang, features, env = "dev", orgs: initialOrgs = null, orgId: initialOrgId = null, view: initialView = null }) {
  initLang(lang);
  const t = useT();
  // Plan/onboarding feature flags resolved server-side (per account role). Defaults
  // keep the dashboard fully functional if a page forgets to pass them.
  const feat = features || { plansEnabled: true, allowUserPlanChanges: true, enabledPlans: PLAN_IDS, defaultPlan: DEFAULT_PLAN_ID, canChangePlan: true };
  const canChangePlan = !!feat.canChangePlan;
  // The signed-in user is held in state so editing the profile (name / photo) updates
  // the sidebar, topbar and account view live, without a reload.
  const [user, setUser] = useState(initialUser);
  // Persist profile edits, then recompute the effective name/photo (custom value, or the
  // OAuth fallback when cleared) so every avatar in the shell refreshes immediately.
  const saveProfile = (patch) =>
    accountApi.updateProfile(patch).then((res) => {
      setUser((u) => ({
        ...u,
        displayName: res.displayName ?? "",
        bio: res.bio ?? "",
        name: res.displayName || u.authName || u.email,
        image: (res.avatarUrl ?? null) || u.authImage || null,
      }));
      return res;
    });
  const [theme, setTheme] = useTheme();
  // The view a link names (?view=, read by the page on the server): the first render is already
  // that view, so the overview never mounts and fetches only to be replaced.
  const [view, setView] = useState(() => (initialView && t.dash.viewLabels[initialView] && !DISABLED_VIEWS.includes(initialView) ? initialView : "overview"));
  // Keep the URL in sync with the active view so a reload restores it (no more snapping back to Overview).
  // Moving to another view drops the last one's list filters (useListFilters keeps them in the URL).
  const shownView = useRef(null);
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (shownView.current !== null && shownView.current !== view) {
        for (const key of [...url.searchParams.keys()]) if (key !== "view") url.searchParams.delete(key);
      }
      shownView.current = view;
      if (view === "overview") url.searchParams.delete("view");
      else url.searchParams.set("view", view);
      window.history.replaceState({}, "", url);
    } catch (e) {}
  }, [view]);
  // Sandbox or production survives a reload: a cookie the page reads on the server, so the first
  // render already shows the chosen environment (no sandbox flash, no second fetch).
  const [live, setLive] = useState(env === "prod");
  const chooseEnv = (next) => {
    setLive(next);
    try { document.cookie = `cosmospay-env=${next ? "prod" : "dev"};path=/;max-age=31536000;samesite=lax`; } catch (e) {}
  };
  // Activity tracking. `startTracking` also wires the uncaught-error and rejected-
  // promise handlers, which is why it runs from the shell rather than from the
  // first view that happens to want an event.
  useEffect(() => { startTracking(live ? "prod" : "dev"); track("dashboard.open", { category: "lifecycle" }); }, []);
  useEffect(() => { setTrackEnv(live ? "prod" : "dev"); }, [live]);
  useEffect(() => { trackView(view); }, [view]);
  // What this person opens, for the overview's quick links (src/lib/dashboard-usage.ts): kept in
  // this browser per account, read after mount so the first render matches the server's. The ref
  // makes a use stored at once (a click on the docs leaves the page before a re-render).
  const usageKey = `cosmospay-usage:${initialUser.id}`;
  const [usage, setUsage] = useState({});
  const usageRef = useRef({});
  const noteUse = (key) => {
    const next = recordUse(usageRef.current, key);
    if (next === usageRef.current) return;
    usageRef.current = next;
    try { localStorage.setItem(usageKey, JSON.stringify(next)); } catch (e) {}
    setUsage(next);
  };
  useEffect(() => {
    try { usageRef.current = parseUsage(localStorage.getItem(usageKey)); } catch (e) {}
    setUsage(usageRef.current);
  }, []);
  useEffect(() => { noteUse(view); }, [view]);
  const [navOpen, setNavOpen] = useState(false);
  // The organizations arrive with the page (dashboard.astro), with the one last picked (the
  // `cosmospay-org` cookie), so every view's first requests already name it. The list is read
  // again after a change (create, delete) or when the page came without it.
  const [orgs, setOrgs] = useState(initialOrgs || []);
  const [curOrg, setCurOrg] = useState(initialOrgId || (initialOrgs && initialOrgs[0] ? initialOrgs[0].id : null));
  const loadOrgs = (preferId) => orgsApi.list().then((d) => {
    const list = Array.isArray(d) ? d : [];
    setOrgs(list);
    setCurOrg((cur) => {
      const want = preferId || cur;
      const pick = list.find((o) => o.id === want) || list[0] || null;
      return pick ? pick.id : null;
    });
  }).catch(() => showToast(t.dash.orgs.loadError, "error"));
  useEffect(() => {
    if (!initialOrgs) { loadOrgs(); return; }
    // The pick used to live in this browser's storage: honour it once, then the cookie carries it.
    if (initialOrgId) return;
    try {
      const old = localStorage.getItem("cosmospay-org");
      if (old && initialOrgs.some((o) => o.id === old)) setCurOrg(old);
      localStorage.removeItem("cosmospay-org");
    } catch (e) {}
  }, []);
  useEffect(() => { try { if (curOrg) document.cookie = `cosmospay-org=${encodeURIComponent(curOrg)};path=/;max-age=31536000;samesite=lax`; } catch (e) {} }, [curOrg]);
  // Real API keys (APISIX-backed), fetched from the developer API, not mocked.
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState(false);
  // Keys are scoped per organization: refetch whenever the active org changes.
  useEffect(() => {
    if (!curOrg) { setKeys([]); setKeysLoading(false); return; }
    let alive = true;
    setKeysLoading(true);
    apiKeysApi.list(curOrg)
      .then((data) => { if (alive) { setKeys(Array.isArray(data) ? data : []); setKeysError(false); } })
      .catch(() => { if (alive) setKeysError(true); })
      .finally(() => { if (alive) setKeysLoading(false); });
    return () => { alive = false; };
  }, [curOrg]);
  const [modal, setModal] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, body, confirmLabel, onConfirm }
  const [renamingOrg, setRenamingOrg] = useState(null);

  // Activity notifications, fetched once and shared across the bell, Overview and Activity views.
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsError, setNotifsError] = useState(false);
  const loadNotifs = () => {
    notificationsApi.list()
      .then((d) => { setNotifs(Array.isArray(d) ? d : []); setNotifsError(false); })
      .catch(() => setNotifsError(true))
      .finally(() => setNotifsLoading(false));
  };
  useEffect(() => {
    // Poll while visible so staff replies (and other server-emitted notifications) reach the bell.
    // The first read is part of the shell's load below.
    const id = setInterval(() => { if (!document.hidden) loadNotifs(); }, 20000);
    return () => clearInterval(id);
  }, []);
  // The server emits notifications asynchronously after key actions, so refetch shortly after.
  const refreshNotifsSoon = () => { setTimeout(loadNotifs, 900); };
  // Payment notifications are tagged with their network (on any chain); surface only those
  // matching the active environment (test networks in Sandbox, mainnets in Production).
  // Notifications without a network (sign-ins, API keys, support) always show.
  const curNet = live ? "public" : "testnet";
  const visibleNotifs = notifs.filter((n) => { const net = n && n.metadata && n.metadata.network; return !net || tierOf(net) === curNet; });
  const unreadNotifs = visibleNotifs.filter((n) => !n.read).length;
  const markNotifsRead = () => {
    if (!unreadNotifs) return;
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    notificationsApi.markRead().catch(() => {});
  };
  useEffect(() => { if (view === "activity") markNotifsRead(); }, [view, unreadNotifs]);
  // The sidebar opens over the page on a phone: Escape closes it.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);
  const isStaff = STAFF_ROLES.includes(user && user.role);
  const isManager = MANAGER_ROLES.includes(user && user.role);
  // Mock billing plan (changeable in Settings). Limits drive the real restrictions.
  const [plan, setPlan] = useState((user && user.plan) || DEFAULT_PLAN_ID);
  const limits = planLimits(plan);
  const changePlan = (next) => {
    const prev = plan;
    setPlan(next);
    accountApi.setPlan(next).catch(() => { setPlan(prev); showToast(t.dash.apikeys.updateError, "error"); });
  };
  // Confirm sensitive (PATCH) plan changes; warn when downgrading locks resources.
  const requestChangePlan = (next) => {
    if (!canChangePlan || next === plan) return;
    const sp = t.dash.settings.plan;
    const curName = t.dash.planNames[plan] || plan;
    const nextName = t.dash.planNames[next] || next;
    // Ladder order includes legacy plans, so leaving the old free plan is never a downgrade.
    const down = ALL_PLAN_IDS.indexOf(next) < ALL_PLAN_IDS.indexOf(plan);
    const body = `${curName} → ${nextName}.` + (down ? ` ${sp.downgradeNote}` : "");
    setConfirm({ title: sp.changeTitle, body, confirmLabel: sp.confirmSwitch, onConfirm: () => changePlan(next) });
  };

  // Downgrade locking: resources you OWN beyond the new plan limits stay but get
  // locked (oldest kept active, newest locked) until you upgrade again. Orgs where
  // you're only a guest are governed by their owner's plan, never yours.
  const byAge = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
  const ownedOrgsSorted = orgs.filter((o) => o.role === "owner").slice().sort(byAge);
  // Org-count limit applies to the orgs YOU own → your account plan.
  const lockedOrgIds = new Set(limits.maxOrgs == null ? [] : ownedOrgsSorted.slice(limits.maxOrgs).map((o) => o.id));

  const usableOrgs = orgs.filter((o) => !lockedOrgIds.has(o.id));
  const org = usableOrgs.find((o) => o.id === curOrg) || usableOrgs[0] || orgs[0] || { id: "", name: "…", role: "member", plan: DEFAULT_PLAN_ID, permissions: [] };
  const ownedOrgCount = orgs.filter((o) => o.role === "owner").length;

  // The active org's keys/seats are governed by the OWNER's plan (the org's subscription),
  // and what I personally can do here is governed by my role + per-action permissions.
  const orgLimits = planLimits(org.plan);
  const myPerms = effectivePermissions(org.role, org.permissions);
  const can = (permission) => myPerms.has(permission);
  // API keys split create / edit / delete across test + production. New keys are minted for
  // the environment currently selected by the test/production switch, so creation is gated by
  // that environment's permission (and, for production, the plan's live-key allowance).
  const canCreateKeys = live
    ? (can("apiKeysLive:create") && orgLimits.allowLive)
    : can("apiKeysTest:create");
  // Production on a plan without live keys: the button would vanish without a word, so the page says why.
  const liveKeysLocked = live && can("apiKeysLive:create") && !orgLimits.allowLive;
  // The keys go by the organization owner's plan: only that owner can lift the limit.
  const keyUpgrade = canChangePlan && org.role === "owner" ? () => setModal("plan") : null;
  const canEditKeys = can("apiKeysTest:edit") || can("apiKeysLive:edit");
  const canDeleteKeys = can("apiKeysTest:delete") || can("apiKeysLive:delete");
  const keysSorted = keys.slice().sort(byAge);
  const lockedKeyIds = new Set([
    ...(orgLimits.maxApiKeys == null ? [] : keysSorted.slice(orgLimits.maxApiKeys).map((k) => k.id)),
    ...(orgLimits.allowLive ? [] : keys.filter((k) => k.environment === "prod").map((k) => k.id)),
  ]);

  const addOrg = (name) => {
    orgsApi.create(name)
      .then((created) => { if (created) { setOrgs((o) => [...o, created]); setCurOrg(created.id); } })
      .catch(() => showToast(t.dash.orgs.createError, "error"));
  };
  const renameOrg = (id, name) => {
    setOrgs((o) => o.map((x) => (x.id === id ? { ...x, name } : x)));
    orgsApi.rename(id, name).catch(() => { showToast(t.dash.orgs.renameError, "error"); loadOrgs(); });
  };
  // Renaming is a PATCH: confirm before applying.
  const requestRenameOrg = (o, name) => {
    const og = t.dash.orgs;
    setConfirm({ title: og.renameTitle, body: `“${o.name}” → “${name}”`, confirmLabel: og.rename, onConfirm: () => renameOrg(o.id, name) });
  };
  const deleteOrg = (id) => {
    orgsApi.remove(id)
      .then(() => { setOrgs((o) => o.filter((x) => x.id !== id)); setCurOrg((cur) => (cur === id ? null : cur)); loadOrgs(); })
      .catch(() => showToast(t.dash.orgs.deleteError, "error"));
  };
  const requestDeleteOrg = (o) => {
    const og = t.dash.orgs;
    setConfirm({ title: og.deleteTitle, body: fmt(og.deleteBody, { name: o.name }), confirmLabel: og.deleteConfirm, onConfirm: () => deleteOrg(o.id) });
  };
  // POST to the developer API; on success prepend the (secret-less) record + reveal the secret once.
  // Keys belong to the active organization (org) and to the environment currently selected by
  // the test/production switch (environment); the modal never asks for either.
  const addKey = (body) => {
    const environment = live ? "prod" : "dev";
    apiKeysApi.create({ ...body, org: curOrg, environment })
      .then((created) => {
        setKeys((k) => [{ id: created.id, createdAt: created.createdAt, updatedAt: created.updatedAt, permissions: created.permissions || [], role: created.role, environment: created.environment || environment, name: created.name, description: created.description }, ...k]);
        setReveal({ id: created.id, secret: created.apiKey });
        refreshNotifsSoon();
      })
      .catch(() => showToast(t.dash.apikeys.createError, "error"));
  };
  const revokeKey = (id) => {
    apiKeysApi.remove(id)
      .then(() => { setKeys((k) => k.filter((x) => x.id !== id)); refreshNotifsSoon(); })
      .catch(() => showToast(t.dash.apikeys.deleteError, "error"));
  };
  // Destructive: ask for confirmation before revoking.
  const requestRevoke = (k) => {
    const ak = t.dash.apikeys;
    setConfirm({
      title: ak.revokeTitle,
      body: fmt(ak.revokeBody, { name: k.name || k.id || ak.unnamed }),
      confirmLabel: ak.revokeConfirm,
      onConfirm: () => revokeKey(k.id),
    });
  };
  // PATCH name/description/role/permissions; merge the returned record back into the list.
  const updateKey = (id, body) => {
    apiKeysApi.update(id, body)
      .then((updated) => { setKeys((k) => k.map((x) => x.id === id ? { ...x, ...updated } : x)); refreshNotifsSoon(); })
      .catch(() => showToast(t.dash.apikeys.updateError, "error"));
  };
  // Cross-organization drill-down filter for the platform-admin views. Sidebar
  // navigation (go) always clears it; only goToAdmin sets it.
  const [adminFilter, setAdminFilter] = useState(null); // { consumer, label, tab? } | null
  // Switching views drops the last view's list filters before the next one reads the URL.
  const clearListFilters = (v) => {
    if (v === view) return;
    try {
      const url = new URL(window.location.href);
      for (const key of [...url.searchParams.keys()]) if (key !== "view") url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", url);
    } catch (e) {}
  };
  const go = (v) => { clearListFilters(v); setView(v); setAdminFilter(null); setNavOpen(false); };
  const goToAdmin = (v, filter = null) => { clearListFilters(v); setView(v); setAdminFilter(filter); setNavOpen(false); };

  // Pending invitations addressed to my email, surfaced as a banner so I can join from
  // inside the dashboard (in addition to the emailed magic link).
  const [myInvites, setMyInvites] = useState([]);

  // Unread support replies → a dot on the sidebar "Support" item. Polled while the tab is
  // visible; cleared when the user opens the relevant ticket (the read flag drops it).
  const [supportUnread, setSupportUnread] = useState(0);
  // The shell's own data comes in one go (product owner: never request after request): the
  // notifications, the invitations addressed to me and support's unread count together. One that
  // fails never holds back the others (allSettled); each then polls on its own.
  useEffect(() => {
    Promise.allSettled([notificationsApi.list(), invitesApi.mine(), supportApi.unread()]).then(([n, i, u]) => {
      if (n.status === "fulfilled") { setNotifs(Array.isArray(n.value) ? n.value : []); setNotifsError(false); } else setNotifsError(true);
      setNotifsLoading(false);
      if (i.status === "fulfilled") setMyInvites(Array.isArray(i.value) ? i.value : []);
      if (u.status === "fulfilled") setSupportUnread((u.value && u.value.count) || 0);
    });
  }, []);
  // Read again on every other view (opening a ticket clears its reply) and while visible.
  const firstUnread = useRef(true);
  useEffect(() => {
    const load = () => { supportApi.unread().then((d) => setSupportUnread((d && d.count) || 0)).catch(() => {}); };
    if (firstUnread.current) firstUnread.current = false;
    else load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 15000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [view]);
  const acceptInvite = (id) => {
    invitesApi.accept(id)
      .then((res) => { setMyInvites((x) => x.filter((i) => i.id !== id)); showToast(t.dash.orgs.joined); loadOrgs(res && res.orgId); })
      .catch((err) => showToast((err && err.message) || t.dash.orgs.joinError, "error"));
  };

  const renderView = () => {
    // The quick links: the views this person opens most (that they may open), else the defaults.
    const quick = quickLinks(usage, (k) => k === "docs" || (!!t.dash.viewLabels[k] && visibleView(k))).map((k) => (k === "docs"
      ? { key: k, label: t.dash.overview.hub.docs, icon: DI.docs, href: DOCS }
      : { key: k, label: t.dash.viewLabels[k], icon: DI[k] || DI.overview, href: `/dashboard?view=${k}` }));
    const overview = <OverviewView org={org} orgs={usableOrgs} onSwitchOrg={setCurOrg} onGo={go} canCreatePayments={can("payments:create")} env={live ? "prod" : "dev"} quick={quick} onQuickUse={noteUse} />;
    switch (view) {
      case "payments": return <PaymentsView canManage={can("payments:create")} canConnectWallets={can("wallets:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "balances": return <BalancesView canManage={can("payments:create")} env={live ? "prod" : "dev"} onGo={go} />;
      case "customers": return <CustomersView canManage={can("customers:create")} orgId={org.id} env={live ? "prod" : "dev"} onGo={go} />;
      case "products": return <ProductsView canManage={can("products:create")} canSell={can("payments:create")} orgId={org.id} env={live ? "prod" : "dev"} onGo={go} />;
      case "swaps": return <SwapsView key="all" canManage={can("payments:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "zkPayments": return <ZkPaymentsView canManage={can("payments:create")} canConnectWallets={can("wallets:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      // Swaps between chains live in the swaps list; the old deep link opens it filtered to them.
      case "crossChainSwaps": return <SwapsView key="cross" defaultType="cross" canManage={can("payments:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "liquidity": return <LiquidityView canManage={can("payments:create")} canConnectWallets={can("wallets:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "blindpay": return <BlindPayView canManage={can("payments:create")} orgId={org.id} orgRole={org.role} env={live ? "prod" : "dev"} />;
      case "developers": return <ApiKeysView keys={keys} env={live ? "prod" : "dev"} loading={keysLoading} error={keysError} limit={orgLimits.maxApiKeys} lockedIds={lockedKeyIds} canCreate={canCreateKeys} canEdit={canEditKeys} canDelete={canDeleteKeys} liveLocked={liveKeysLocked} onUpgrade={keyUpgrade} onCreate={() => setModal("key")} onRevoke={requestRevoke} onEdit={setEditing} />;
      case "webhook": return <WebhooksView canManage={can("webhooks:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "logs": return <LogsView kind="api" env={live ? "prod" : "dev"} />;
      case "weblogs": return <LogsView kind="webhooks" env={live ? "prod" : "dev"} />;
      case "activityLog": return <ActivityLogView env={live ? "prod" : "dev"} />;
      case "activity": return <NotificationsView notifications={visibleNotifs} loading={notifsLoading} error={notifsError} onGo={go} />;
      case "support": return <SupportView />;
      case "inbox": return isStaff ? <SupportInboxView /> : overview;
      case "users": return isManager ? <UsersView currentUserId={user.id} currentRole={user.role} /> : overview;
      case "adminOverview": return isManager ? <AdminOverviewView env={live ? "prod" : "dev"} goToAdmin={goToAdmin} /> : overview;
      case "adminPayments": return isManager ? <AdminPaymentsView env={live ? "prod" : "dev"} adminFilter={adminFilter} goToAdmin={goToAdmin} /> : overview;
      case "adminSwaps": return isManager ? <AdminSwapsView env={live ? "prod" : "dev"} adminFilter={adminFilter} goToAdmin={goToAdmin} /> : overview;
      case "adminFiat": return isManager ? <AdminFiatView env={live ? "prod" : "dev"} adminFilter={adminFilter} goToAdmin={goToAdmin} /> : overview;
      case "adminCustomers": return isManager ? <AdminCustomersView adminFilter={adminFilter} goToAdmin={goToAdmin} /> : overview;
      case "adminProducts": return isManager ? <AdminProductsView adminFilter={adminFilter} goToAdmin={goToAdmin} /> : overview;
      case "adminConsumers": return isManager ? <AdminConsumersView goToAdmin={goToAdmin} /> : overview;
      case "settings": return <SettingsView org={org} orgCount={orgs.length} limits={limits} keyCount={keys.length} walletPerms={{ create: can("wallets:create"), edit: can("wallets:edit"), remove: can("wallets:delete") }} onRenameOrg={(o) => setRenamingOrg(o)} onDeleteOrg={requestDeleteOrg} />;
      case "account": return <AccountView user={user} theme={theme} setTheme={setTheme} planId={plan} limits={limits} orgCount={orgs.length} onChangePlan={canChangePlan ? () => setModal("plan") : null} plansEnabled={feat.plansEnabled} onSaveProfile={saveProfile} />;
      default: return overview;
    }
  };

  // What this viewer's role may see in the sidebar.
  const visibleView = (k) => !DISABLED_VIEWS.includes(k) && (isStaff || !STAFF_ONLY.includes(k)) && (isManager || !MANAGER_ONLY.includes(k)) && (isManager || !OWNER_ONLY.includes(k));

  return (
    <div className={`dash${navOpen ? " nav-open" : ""}`}>
      {/* The product owner's gateway-dashboard reference: the whole dashboard is one white frame on
          the canvas, the sidebar (logo, main menu, preferences) on its left. */}
      <div className="dash-frame">
        <div className="nav-scrim" onClick={() => setNavOpen(false)} />
        <aside className="side" id="dash-side">
          <Sidebar view={view === "crossChainSwaps" ? "swaps" : view} go={go} visible={visibleView} unread={unreadNotifs} supportUnread={supportUnread} />
        </aside>

        <div className="dash-main">
          {/* The general nav, as on every view, adapted to the frame (Nav inDash). */}
          <Nav theme={theme} setTheme={setTheme} user={user} sessionReady inDash onAccount={() => go("account")} search={<DashSearch go={go} view={view} visible={visibleView} />} />
          {/* The page head opens the main landmark (the nav above is the page banner), so the
              view's h1 and the environment switch belong to the content they title. */}
          <main id="main" className="dash-content">
          <div className="topbar">
            <button type="button" className="icon-btn burger" aria-label={t.nav.menu} aria-expanded={navOpen} aria-controls="dash-side" onClick={() => setNavOpen(true)}>{DI.menu}</button>
            <div className="page-title">
              <h1>{t.dash.viewLabels[view]}</h1>
              <span className="page-crumb" aria-hidden="true">/</span>
              <OrgSwitcher variant="crumb" orgs={orgs} current={org} onSwitch={setCurOrg} onCreate={() => setModal("org")} lockedIds={lockedOrgIds} onUpgrade={canChangePlan ? () => setModal("plan") : null} />
            </div>
            <div className="top-actions">
              <div className="env-seg" role="group" aria-label={t.dash.env.heading}>
                <button type="button" aria-pressed={!live} onClick={() => chooseEnv(false)}>{t.dash.env.sandbox}</button>
                <button type="button" aria-pressed={live} onClick={() => chooseEnv(true)}>{t.dash.env.production}</button>
              </div>
              <button type="button" className="btn btn-outline-w btn-sm top-add" onClick={() => setModal("org")}>{DI.plus}<span className="top-add-t">{t.dash.org.create}</span></button>
            </div>
          </div>
        {myInvites.length > 0 && (
          <div className="invite-bar">
            {myInvites.map((iv) => (
              <div className="invite-bar-row" key={iv.id}>
                <span className="ib-ico">{DI.org}</span>
                <div className="ib-body">
                  <b>{fmt(t.dash.orgs.bannerTitle, { org: iv.orgName })}</b>
                  <span>{fmt(t.dash.orgs.bannerSub, { role: (t.dash.orgs.roles && t.dash.orgs.roles[iv.role]) || iv.role })}</span>
                </div>
                <button className="btn btn-violet btn-sm" onClick={() => acceptInvite(iv.id)}>{t.dash.orgs.join}</button>
              </div>
            ))}
          </div>
        )}
          <div className="dash-body" key={view}>{renderView()}</div>
          </main>
        </div>
      </div>

      {modal === "org" && <CreateOrgModal onClose={() => setModal(null)} onAdd={addOrg} count={ownedOrgCount} limit={limits.maxOrgs == null ? Infinity : limits.maxOrgs} planName={t.dash.planNames[plan] || plan} onUpgrade={canChangePlan ? () => setModal("plan") : null} />}
      {modal === "plan" && canChangePlan && <PlanModal current={plan} enabledPlans={feat.enabledPlans} onClose={() => setModal(null)} onSelect={requestChangePlan} />}
      {renamingOrg && <RenameOrgModal current={renamingOrg} onClose={() => setRenamingOrg(null)} onRename={(name) => requestRenameOrg(renamingOrg, name)} />}
      {modal === "key" && <ApiKeyModal mode="create" onClose={() => setModal(null)} onSubmit={addKey} />}
      {editing && <ApiKeyModal mode="edit" initial={editing} onClose={() => setEditing(null)} onSubmit={(body) => updateKey(editing.id, body)} />}
      {reveal && <RevealKeyModal k={reveal} onClose={() => setReveal(null)} />}
      {confirm && <ConfirmModal title={confirm.title} body={confirm.body} confirmLabel={confirm.confirmLabel} cancelLabel={t.dash.common.cancel} onConfirm={confirm.onConfirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
