/* Dashboard.jsx — Cosmos Pay developer dashboard shell. Ported from the Design bundle.
   Auth/profile are real (Authentik session passed in via props); data is mock.
   All UI copy comes from the i18n catalog (useT). */
import { useState, useEffect } from "react";
import {
  CosmosMark, ConfirmModal, useTheme,
  IcSun, IcMoon, HOME, LangSelect, showToast,
} from "@/components/cosmos/shared";
import { useT, fmt, initLang } from "@/lib/i18n/index";
import { apiKeys as apiKeysApi, notifications as notificationsApi, account as accountApi, organizations as orgsApi, invites as invitesApi, support as supportApi } from "@/lib/api-client";
import { planLimits, PLAN_IDS } from "@/lib/plans.ts";
import { effectivePermissions } from "@/lib/org-permissions.ts";
import { DI } from "@/components/cosmos/dashboard/icons";
import { SIDE, STAFF_ROLES, MANAGER_ROLES, STAFF_ONLY, MANAGER_ONLY, OWNER_ONLY } from "@/components/cosmos/dashboard/data";
import {
  OverviewView, PaymentsView, BalancesView, CustomersView, ProductsView, SwapsView, LiquidityView, BlindPayView,
  ApiKeysView, WebhooksView, LogsView, NotificationsView, SupportView, SupportInboxView, UsersView, SettingsView, AccountView,
  AdminOverviewView, AdminPaymentsView, AdminSwapsView, AdminFiatView, AdminCustomersView, AdminProductsView, AdminConsumersView,
} from "@/components/cosmos/dashboard/views/index";
import { OrgSwitcher } from "@/components/cosmos/dashboard/widgets/OrgSwitcher";
import { EnvSwitcher } from "@/components/cosmos/dashboard/widgets/EnvSwitcher";
import { ProfileMenu } from "@/components/cosmos/dashboard/widgets/ProfileMenu";
import { TopbarProfile } from "@/components/cosmos/dashboard/widgets/TopbarProfile";
import { NotificationsMenu } from "@/components/cosmos/dashboard/widgets/NotificationsMenu";
import { CreateOrgModal, RenameOrgModal, ApiKeyModal, PlanModal, RevealKeyModal } from "@/components/cosmos/dashboard/modals/index";

/* ---------------- shell ---------------- */
export default function Dashboard({ user: initialUser, lang, features }) {
  initLang(lang);
  const t = useT();
  // Plan/onboarding feature flags resolved server-side (per account role). Defaults
  // keep the dashboard fully functional if a page forgets to pass them.
  const feat = features || { plansEnabled: true, allowUserPlanChanges: true, enabledPlans: PLAN_IDS, defaultPlan: "community", canChangePlan: true };
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
  const [view, setView] = useState("overview");
  // Allow deep-linking a view via ?view= (e.g. the nav "Account settings" → ?view=settings).
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v && t.dash.viewLabels[v]) setView(v);
    } catch (e) {}
  }, []);
  // Keep the URL in sync with the active view so a reload restores it (no more snapping back to Overview).
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (view === "overview") url.searchParams.delete("view");
      else url.searchParams.set("view", view);
      window.history.replaceState({}, "", url);
    } catch (e) {}
  }, [view]);
  const [live, setLive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // Real organizations (API-backed). The active org is persisted to localStorage.
  const [orgs, setOrgs] = useState([]);
  const [curOrg, setCurOrg] = useState(null);
  const loadOrgs = (preferId) => orgsApi.list().then((d) => {
    const list = Array.isArray(d) ? d : [];
    setOrgs(list);
    setCurOrg((cur) => {
      let want = preferId || cur;
      if (!want) { try { want = localStorage.getItem("cosmospay-org"); } catch (e) {} }
      const pick = list.find((o) => o.id === want) || list[0] || null;
      return pick ? pick.id : null;
    });
  }).catch(() => showToast(t.dash.orgs.loadError, "error"));
  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { try { if (curOrg) localStorage.setItem("cosmospay-org", curOrg); } catch (e) {} }, [curOrg]);
  // Real API keys (APISIX-backed) — fetched from the developer API, not mocked.
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState(false);
  // Keys are scoped per organization — refetch whenever the active org changes.
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

  // Activity notifications — fetched once and shared across the bell, Overview and Activity views.
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
    loadNotifs();
    // Poll while visible so staff replies (and other server-emitted notifications) reach the bell.
    const id = setInterval(() => { if (!document.hidden) loadNotifs(); }, 20000);
    return () => clearInterval(id);
  }, []);
  // The server emits notifications asynchronously after key actions — refetch shortly after.
  const refreshNotifsSoon = () => { setTimeout(loadNotifs, 900); };
  // Payment notifications are tagged with their Stellar network; surface only those
  // matching the active environment (test → testnet, live → public). Notifications
  // without a network (sign-ins, API keys, support) always show.
  const curNet = live ? "public" : "testnet";
  const visibleNotifs = notifs.filter((n) => { const net = n && n.metadata && n.metadata.network; return !net || net === curNet; });
  const unreadNotifs = visibleNotifs.filter((n) => !n.read).length;
  const markNotifsRead = () => {
    if (!unreadNotifs) return;
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    notificationsApi.markRead().catch(() => {});
  };
  const isStaff = STAFF_ROLES.includes(user && user.role);
  const isManager = MANAGER_ROLES.includes(user && user.role);
  // Mock billing plan (changeable in Settings). Limits drive the real restrictions.
  const [plan, setPlan] = useState((user && user.plan) || "community");
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
    const down = PLAN_IDS.indexOf(next) < PLAN_IDS.indexOf(plan);
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
  const org = usableOrgs.find((o) => o.id === curOrg) || usableOrgs[0] || orgs[0] || { id: "", name: "…", role: "member", plan: "community", permissions: [] };
  const userName = user?.name || "there";
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
  // Renaming is a PATCH — confirm before applying.
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
  // the test/production switch (environment) — the modal never asks for either.
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
  // Destructive — ask for confirmation before revoking.
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
  const go = (v) => { setView(v); setAdminFilter(null); setNavOpen(false); };
  const goToAdmin = (v, filter = null) => { setView(v); setAdminFilter(filter); setNavOpen(false); };

  // Pending invitations addressed to my email — surfaced as a banner so I can join from
  // inside the dashboard (in addition to the emailed magic link).
  const [myInvites, setMyInvites] = useState([]);
  const loadMyInvites = () => { invitesApi.mine().then((d) => setMyInvites(Array.isArray(d) ? d : [])).catch(() => {}); };
  useEffect(() => { loadMyInvites(); }, []);

  // Unread support replies → a dot on the sidebar "Support" item. Polled while the tab is
  // visible; cleared when the user opens the relevant ticket (the read flag drops it).
  const [supportUnread, setSupportUnread] = useState(0);
  useEffect(() => {
    const load = () => { supportApi.unread().then((d) => setSupportUnread((d && d.count) || 0)).catch(() => {}); };
    load();
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
    switch (view) {
      case "payments": return <PaymentsView canManage={can("payments:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "balances": return <BalancesView canManage={can("payments:create")} env={live ? "prod" : "dev"} />;
      case "customers": return <CustomersView canManage={can("customers:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "products": return <ProductsView canManage={can("products:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "swaps": return <SwapsView canManage={can("payments:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "liquidity": return <LiquidityView canManage={can("payments:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "blindpay": return <BlindPayView canManage={can("payments:create")} orgId={org.id} orgRole={org.role} env={live ? "prod" : "dev"} />;
      case "developers": return <ApiKeysView keys={keys} env={live ? "prod" : "dev"} loading={keysLoading} error={keysError} limit={orgLimits.maxApiKeys} lockedIds={lockedKeyIds} canCreate={canCreateKeys} canEdit={canEditKeys} canDelete={canDeleteKeys} onCreate={() => setModal("key")} onRevoke={requestRevoke} onEdit={setEditing} />;
      case "webhook": return <WebhooksView canManage={can("webhooks:create")} orgId={org.id} env={live ? "prod" : "dev"} />;
      case "logs": return <LogsView kind="api" env={live ? "prod" : "dev"} />;
      case "weblogs": return <LogsView kind="webhooks" env={live ? "prod" : "dev"} />;
      case "activity": return <NotificationsView notifications={visibleNotifs} loading={notifsLoading} error={notifsError} />;
      case "support": return <SupportView />;
      case "inbox": return isStaff ? <SupportInboxView /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "users": return isManager ? <UsersView currentUserId={user.id} currentRole={user.role} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminOverview": return isManager ? <AdminOverviewView env={live ? "prod" : "dev"} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminPayments": return isManager ? <AdminPaymentsView env={live ? "prod" : "dev"} adminFilter={adminFilter} goToAdmin={goToAdmin} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminSwaps": return isManager ? <AdminSwapsView env={live ? "prod" : "dev"} adminFilter={adminFilter} goToAdmin={goToAdmin} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminFiat": return isManager ? <AdminFiatView env={live ? "prod" : "dev"} adminFilter={adminFilter} goToAdmin={goToAdmin} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminCustomers": return isManager ? <AdminCustomersView adminFilter={adminFilter} goToAdmin={goToAdmin} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminProducts": return isManager ? <AdminProductsView adminFilter={adminFilter} goToAdmin={goToAdmin} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "adminConsumers": return isManager ? <AdminConsumersView goToAdmin={goToAdmin} /> : <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
      case "settings": return <SettingsView org={org} orgCount={orgs.length} limits={limits} keyCount={keys.length} onRenameOrg={(o) => setRenamingOrg(o)} onDeleteOrg={requestDeleteOrg} />;
      case "account": return <AccountView user={user} theme={theme} setTheme={setTheme} planId={plan} limits={limits} orgCount={orgs.length} onChangePlan={canChangePlan ? () => setModal("plan") : null} plansEnabled={feat.plansEnabled} onSaveProfile={saveProfile} />;
      default: return <OverviewView org={org} userName={userName} notifications={visibleNotifs} onViewActivity={() => go("activity")} env={live ? "prod" : "dev"} />;
    }
  };

  return (
    <div className={`dash${collapsed ? " collapsed" : ""}${navOpen ? " nav-open" : ""}`}>
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <aside className="side">
        <div className="side-top">
          <div className="side-brand-row">
            <a className="brand" href={HOME}><CosmosMark size={26} color="var(--ink)" /> <span className="lbl">Cosmos&nbsp;Pay</span></a>
            <button className="collapse-btn" title={t.dash.sidebar.collapse} aria-label={t.dash.sidebar.collapse} onClick={() => setCollapsed((c) => !c)}>{DI.collapse}</button>
          </div>
          <OrgSwitcher orgs={orgs} current={org} onSwitch={setCurOrg} onCreate={() => setModal("org")} lockedIds={lockedOrgIds} />
          <EnvSwitcher live={live} setLive={setLive} />
        </div>
        <nav className="side-nav">
          {SIDE.map((g) => { const items = g.items.filter((k) => (isStaff || !STAFF_ONLY.includes(k)) && (isManager || !MANAGER_ONLY.includes(k)) && (isManager || !OWNER_ONLY.includes(k))); if (!items.length) return null; return (<div key={g.sec}><div className="side-sec lbl">{t.dash.sidebar.sections[g.sec]}</div>{items.map((k) => (<div key={k} role="button" tabIndex={0} aria-current={view === k ? "page" : undefined} aria-label={t.dash.sidebar.items[k]} className={`side-link${view === k ? " active" : ""}`} title={t.dash.sidebar.items[k]} onClick={() => go(k)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(k); } }}>{DI[k]}<span className="lbl">{t.dash.sidebar.items[k]}</span>{k === "support" && supportUnread > 0 && <span className="side-dot" />}</div>))}</div>); })}
        </nav>
        <ProfileMenu user={user} onAccount={() => go("account")} />
      </aside>

      <div className="dash-main">
        <header className="topbar">
          <button className="icon-btn burger" title={t.nav.menu} aria-label={t.nav.menu} onClick={() => setNavOpen(true)}>{DI.menu}</button>
          <h1>{t.dash.viewLabels[view]}</h1>
          <div className="search">{DI.search}<input placeholder={t.dash.topbar.search} aria-label={t.dash.topbar.search} /></div>
          <div className="top-actions">
            <LangSelect />
            <button className="icon-btn" title={t.dash.topbar.theme} aria-label={t.dash.topbar.theme} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <IcSun /> : <IcMoon />}</button>
            <NotificationsMenu items={visibleNotifs} loading={notifsLoading} error={notifsError} unread={unreadNotifs} onOpen={markNotifsRead} onViewAll={() => go("activity")} />
            <TopbarProfile user={user} onAccount={() => go("account")} />
          </div>
        </header>
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
        <main id="main" className="dash-body" key={view}>{renderView()}</main>
      </div>

      {modal === "org" && <CreateOrgModal onClose={() => setModal(null)} onAdd={addOrg} count={ownedOrgCount} limit={limits.maxOrgs == null ? Infinity : limits.maxOrgs} planName={t.dash.planNames[plan] || plan} />}
      {modal === "plan" && canChangePlan && <PlanModal current={plan} enabledPlans={feat.enabledPlans} onClose={() => setModal(null)} onSelect={requestChangePlan} />}
      {renamingOrg && <RenameOrgModal current={renamingOrg} onClose={() => setRenamingOrg(null)} onRename={(name) => requestRenameOrg(renamingOrg, name)} />}
      {modal === "key" && <ApiKeyModal mode="create" onClose={() => setModal(null)} onSubmit={addKey} />}
      {editing && <ApiKeyModal mode="edit" initial={editing} onClose={() => setEditing(null)} onSubmit={(body) => updateKey(editing.id, body)} />}
      {reveal && <RevealKeyModal k={reveal} onClose={() => setReveal(null)} />}
      {confirm && <ConfirmModal title={confirm.title} body={confirm.body} confirmLabel={confirm.confirmLabel} cancelLabel={t.dash.common.cancel} onConfirm={confirm.onConfirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
