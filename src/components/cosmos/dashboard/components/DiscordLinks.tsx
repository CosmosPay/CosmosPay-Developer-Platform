/* Settings' Discord section: the Discord servers linked to the organization, so the Cosmos Pay bot
   takes payments there into one of the organization's wallets (src/lib/discord-link.ts has the
   flow). Placed after the wallets, as every second list on a page: its h2, its own filter bar
   (keys dq, denv, dchain, ddate) with "Connect Discord" at the row's right end, and the Payments
   table (a row opens its detail; unlink from the row, its menu and its detail, confirmed first;
   several rows at once with BulkSelect).
   - Not drawn at all while this deployment has no Discord application (the list answers 503), and
     not until the list has answered, so no ghost section shows for a moment.
   - Linking mints an API key in the dashboard's environment: "Connect Discord" follows the API
     keys rules (the environment's create permission, production keys on the plan, the plan's key
     limit, with the plan dialog for the owner, as ApiKeysView does).
   - The create dialog, in two steps: the network and one of the organization's wallets on it
     (WalletSelect, with "connect another" inline), then the asset; it ends by opening Discord.
   - The callback comes back with its outcome in the address (`discord`, `reason`, `detail`), read
     once (useUrlRequest) and shown as a notice in the viewer's language, the section scrolled into
     view. */
import { useEffect, useRef, useState } from "react";
import { ConfirmModal, Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { organizations as orgsApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy, IcX } from "@/components/cosmos/icons";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { BulkActions, SelectCell, SelectHead, useBulkDelete, useSelection } from "@/components/cosmos/dashboard/components/BulkSelect";
import { NetworkMark, ORG_WALLETS_EVENT, WalletSelect, useOrgWallets } from "@/components/cosmos/dashboard/components/OrgWallets";
import { usePaged, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { DATE_RANGES, countBy, inRange, matchesQuery, type DateRange } from "@/lib/dashboard-filters";
import { NETWORKS_BY_NAME, explorerAccountUrl, networkName, tierOf, type NetworkId } from "@/lib/chains";
import { DEFAULT_LINK_ASSET, normalizeLinkAsset, readLinkOutcome, type LinkOutcome } from "@/lib/discord-link-shared";

export interface DiscordLink {
  id: string;
  guildId: string;
  guildName: string;
  environment: "dev" | "prod";
  chain: string;
  address: string;
  asset: string;
  apiKeyId: string;
  discordUserId: string | null;
  discordUsername: string | null;
  createdBy: { id: string; name: string | null; email: string | null };
  createdAt: string;
  updatedAt: string;
}

/** The links: undefined while loading, "off" when the deployment has no Discord, null on a load error. */
function useDiscordLinks(orgId: string) {
  const [links, setLinks] = useState<DiscordLink[] | null | undefined | "off">(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!orgId) return;
    let current = true;
    orgsApi.discordLinks(orgId)
      .then((d) => { if (current) setLinks(Array.isArray(d) ? d : []); })
      .catch((err) => { if (current) setLinks(err && err.status === 503 ? "off" : null); });
    return () => { current = false; };
  }, [orgId, tick]);
  // Removing a wallet unlinks the servers that pay into it: read the list again.
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    window.addEventListener(ORG_WALLETS_EVENT, again);
    return () => window.removeEventListener(ORG_WALLETS_EVENT, again);
  }, []);
  return { links, reload: () => setTick((n) => n + 1) };
}

const LINK_DEFAULTS = { dq: "", denv: "all", dchain: "all", ddate: "any" };
const LINK_ALLOWED = { denv: ["all", "dev", "prod"], dchain: ["all", ...NETWORKS_BY_NAME], ddate: [...DATE_RANGES] };

export interface DiscordPerms {
  /** May link in the dashboard's environment: its create permission and, in production, the plan's live keys. */
  create: boolean;
  /** May unlink a test link / a production link (the environment's API key delete permission). */
  removeTest: boolean;
  removeLive: boolean;
  /** May connect another wallet from the dialog (`wallets:create`). */
  connectWallets: boolean;
}

export function DiscordSection({ orgId, env, perms, keyLimitReached, liveLocked, onUpgrade, onKeysRemoved }: {
  orgId: string;
  env: "dev" | "prod";
  perms: DiscordPerms;
  keyLimitReached: boolean;
  liveLocked: boolean;
  onUpgrade: (() => void) | null;
  onKeysRemoved: (apiKeyIds: string[]) => void;
}) {
  const t = useT();
  const dc = t.dash.discord;
  const ak = t.dash.apikeys;
  const fl = t.dash.filters;
  const cm = t.dash.common;
  const { links: state, reload } = useDiscordLinks(orgId);
  const { filters, set, reset, active } = useListFilters(LINK_DEFAULTS, LINK_ALLOWED);
  const [connecting, setConnecting] = useState(false);
  const [open, setOpen] = useState<DiscordLink | null>(null);
  const [removing, setRemoving] = useState<DiscordLink | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // What the callback said, read once from the address.
  const [discordReq, clearDiscord] = useUrlRequest("discord");
  const [reasonReq, clearReason] = useUrlRequest("reason");
  const [detailReq, clearDetail] = useUrlRequest("detail");
  const [warningReq, clearWarning] = useUrlRequest("warning");
  const outcome: LinkOutcome | null = readLinkOutcome(discordReq, reasonReq, detailReq, warningReq);
  const dismiss = () => { clearDiscord(); clearReason(); clearDetail(); clearWarning(); };
  const ready = state !== undefined && state !== "off";
  useEffect(() => {
    if (outcome && ready) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [!!outcome, ready]);

  const links = Array.isArray(state) ? state : [];
  const canRemove = (x: DiscordLink) => (x.environment === "prod" ? perms.removeLive : perms.removeTest);
  const anyRemove = perms.removeTest || perms.removeLive;
  const envName = (e: string) => (e === "prod" ? t.dash.env.production : t.dash.env.sandbox);
  const tierFor = (x: DiscordLink) => (x.environment === "prod" ? "public" : "testnet");
  const explorer = (x: DiscordLink) => explorerAccountUrl(x.chain as NetworkId, tierOf(tierFor(x)), x.address);
  const linkedBy = (x: DiscordLink) => x.discordUsername || x.createdBy.name || x.createdBy.email || "-";
  const member = (x: DiscordLink) => x.createdBy.name || x.createdBy.email || "-";

  const matches = (x: DiscordLink, skip: string | null) =>
    (skip === "env" || filters.denv === "all" || x.environment === filters.denv) &&
    (skip === "chain" || filters.dchain === "all" || x.chain === filters.dchain) &&
    inRange(x.createdAt, filters.ddate as DateRange) &&
    matchesQuery([x.guildName, x.guildId, x.address, x.asset, networkName(x.chain), x.discordUsername, x.createdBy.name, x.createdBy.email], filters.dq);
  const rows = links.filter((x) => matches(x, null));
  const envCounts = countBy(links.filter((x) => matches(x, "env")), (x) => x.environment);
  const chainCounts = countBy(links.filter((x) => matches(x, "chain")), (x) => x.chain);
  const linkNetworks = NETWORKS_BY_NAME.filter((c) => links.some((x) => x.chain === c) || filters.dchain === c);
  const pg = usePaged(rows, JSON.stringify(filters));
  const pageRows: DiscordLink[] = pg.slice;

  const picked = useSelection(rows.filter(canRemove).map((x) => x.id));
  const removed = (ids: string[]) => {
    const keys = links.filter((x) => ids.includes(x.id)).map((x) => x.apiKeyId);
    onKeysRemoved(keys);
    if (open && ids.includes(open.id)) setOpen(null);
    reload();
  };
  const bulk = useBulkDelete({
    sel: picked,
    nameOf: (id) => links.find((x) => x.id === id)?.guildName || id,
    remove: (id) => orgsApi.discordUnlink(orgId, id),
    onRemoved: removed,
  });
  const unlink = (x: DiscordLink) =>
    orgsApi.discordUnlink(orgId, x.id)
      .then(() => { removed([x.id]); showToast(dc.unlinked); })
      .catch(() => showToast(dc.unlinkError, "error"));
  const copy = (value: string) => navigator.clipboard?.writeText(value).then(() => showToast(t.toasts.copied)).catch(() => {});

  if (!ready) return null;
  const failed = state === null;
  const cols = 7 + (anyRemove ? 1 : 0);
  const removeHint = (x: DiscordLink) => (canRemove(x) ? undefined : dc.unlinkNoPermission);
  const items = (x: DiscordLink) => {
    const url = explorer(x);
    return [
      { key: "open", label: cm.details, icon: DI.docs, onClick: () => setOpen(x) },
      { key: "copyId", label: dc.copyServerId, icon: <IcCopy />, onClick: () => copy(x.guildId) },
      { key: "copy", label: cm.copyAccount, icon: <IcCopy />, onClick: () => copy(x.address) },
      { key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: url, external: true, disabled: !url },
      ...(anyRemove ? [{ key: "unlink", label: dc.unlink, icon: DI.trash, danger: true, disabled: !canRemove(x), hint: removeHint(x), onClick: () => setRemoving(x) }] : []),
    ];
  };
  const limited = (perms.create && keyLimitReached) || liveLocked;
  const createButton = perms.create && (
    <button type="button" className="btn btn-dark btn-sm" disabled={keyLimitReached} title={keyLimitReached ? ak.limitReached : undefined} onClick={() => setConnecting(true)}>{DI.plus} {dc.connect}</button>
  );

  return (
    <section ref={sectionRef} className="hub-section set-section" aria-labelledby="discord-title">
      <div className="hub-section-head"><h2 id="discord-title">{dc.title}</h2></div>
      {outcome && <OutcomeNotice outcome={outcome} onUpgrade={onUpgrade} onDismiss={dismiss} />}
      {limited && (
        <div className="note-bar">
          {DI.key}
          <span>{liveLocked ? ak.liveLocked : ak.limitReached} {!onUpgrade && ak.ownerPlan}</span>
          {onUpgrade && <button type="button" className="btn btn-dark btn-sm note-bar-act" onClick={onUpgrade}>{cm.viewPlans}</button>}
        </div>
      )}
      <FilterBar
        label={fl.label}
        query={filters.dq} onQuery={(v) => set("dq", v)} placeholder={dc.searchPlaceholder}
        selects={[
          { key: "denv", label: dc.tableHead.environment, value: filters.denv, onChange: (v) => set("denv", v), options: [{ key: "all", label: dc.allEnvironments }, ...(["dev", "prod"] as const).map((e) => ({ key: e, label: envName(e), count: envCounts[e] || 0 }))] },
          { key: "dchain", label: fl.network, value: filters.dchain, onChange: (v) => set("dchain", v), options: [{ key: "all", label: fl.allNetworks }, ...linkNetworks.map((c) => ({ key: c, label: networkName(c), icon: <NetworkMark chain={c} size={18} />, count: chainCounts[c] || 0 }))] },
        ]}
        date={filters.ddate} onDate={(v) => set("ddate", v)}
        active={active} onReset={reset}
        shown={rows.length} total={failed ? undefined : links.length} loading={false}
        actions={picked.count ? <BulkActions sel={picked} onDelete={bulk.ask} busy={bulk.busy} /> : createButton}
      />
      <div className="panel">
        <div className="t-scroll" tabIndex={0}><table className="tx">
          <thead><tr>
            {anyRemove && <SelectHead sel={picked} pageIds={pageRows.filter(canRemove).map((x) => x.id)} />}
            <th>{dc.tableHead.server}</th><th>{dc.tableHead.environment}</th><th>{dc.tableHead.wallet}</th><th>{dc.tableHead.asset}</th><th>{dc.tableHead.linkedBy}</th><th>{dc.tableHead.linked}</th><th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
          <tbody>
            {!failed && pageRows.map((x) => {
              const url = explorer(x);
              return (
                <tr key={x.id} className="row-click" onClick={() => setOpen(x)}>
                  {anyRemove && <SelectCell sel={picked} id={x.id} name={x.guildName} disabled={!canRemove(x)} hint={removeHint(x)} />}
                  <td className="tid">
                    <span className="cell-mark">
                      <span className="am-sq">{DI.discord}</span>
                      <span>
                        <RecordLink
                          onOpen={() => setOpen(x)} copy={x.guildId} title={x.guildId}
                          preview={() => <PreviewCard label={dc.detail} title={x.guildId} headline={<b>{x.guildName}</b>} fields={[[dc.tableHead.environment, envName(x.environment)], [t.dash.wallets.tableHead.network, networkName(x.chain)], [dc.tableHead.asset, x.asset], [dc.tableHead.linked, fmtDateTime(x.createdAt)]]} />}
                        >{x.guildName}</RecordLink>
                        <small className="cust-wallet-net">{x.guildId}</small>
                      </span>
                    </span>
                  </td>
                  <td className="cust">{envName(x.environment)}</td>
                  <td className="cust" onClick={(e) => e.stopPropagation()}>
                    <span className="cell-mark"><NetworkMark chain={x.chain} size={18} /><AddressLink chain={x.chain} network={tierFor(x)} address={x.address} label={dc.tableHead.wallet} /></span>
                  </td>
                  <td className="cust">{x.asset}</td>
                  <td className="cust">{linkedBy(x)}{x.discordUsername && member(x) !== "-" && <small className="cust-wallet-net">{member(x)}</small>}</td>
                  <td className="cust">{fmtDateTime(x.createdAt)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${x.guildName}`} onClick={() => setOpen(x)}>{DI.docs}</button>
                    {url
                      ? <a className="icon-mini" href={url} target="_blank" rel="noopener noreferrer" title={t.dash.balances.explorer} aria-label={`${t.dash.balances.explorer}: ${x.guildName}`}>{DI.network}</a>
                      : <button type="button" className="icon-mini" disabled title={t.dash.balances.explorer} aria-label={`${t.dash.balances.explorer}: ${x.guildName}`}>{DI.network}</button>}
                    {anyRemove && <button type="button" className="icon-mini danger" title={removeHint(x) || dc.unlink} aria-label={`${dc.unlink}: ${x.guildName}`} disabled={!canRemove(x)} onClick={() => setRemoving(x)}>{DI.trash}</button>}
                    <RowMenu label={fmt(cm.rowActions, { name: x.guildName })} items={items(x)} />
                  </td>
                </tr>
              );
            })}
            <FillRows n={pg.size - (failed ? 0 : pg.count)} cols={cols} empty={failed ? dc.loadError : null} />
          </tbody>
        </table></div>
        <Pagination {...pg} />
      </div>
      {open && (
        <RecordDetail
          eyebrow={dc.detail} title={open.guildName} onClose={() => setOpen(null)}
          fields={[
            [dc.serverId, open.guildId],
            [dc.tableHead.environment, envName(open.environment)],
            [t.dash.wallets.tableHead.network, <span key="n" className="cell-mark"><NetworkMark chain={open.chain} size={18} />{networkName(open.chain)}</span>],
            [dc.tableHead.wallet, <AddressLink key="a" chain={open.chain} network={tierFor(open)} address={open.address} label={dc.tableHead.wallet} />],
            [dc.tableHead.asset, open.asset],
            [dc.discordAccount, open.discordUsername],
            [dc.member, member(open) === "-" ? null : member(open)],
            [dc.apiKey, shortAddress(open.apiKeyId)],
            [dc.tableHead.linked, fmtDateTime(open.createdAt)],
          ]}
          actions={[
            ...(canRemove(open) ? [{ key: "unlink", label: dc.unlink, icon: DI.trash, kind: "danger" as const, onClick: () => setRemoving(open) }] : []),
            { key: "copyId", label: dc.copyServerId, icon: <IcCopy />, onClick: () => copy(open.guildId) },
            ...(explorer(open) ? [{ key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: explorer(open) }] : []),
          ]}
        />
      )}
      {connecting && (
        <ConnectDiscordModal
          orgId={orgId} env={env} canConnectWallets={perms.connectWallets}
          onClose={() => setConnecting(false)}
          onLimit={() => { setConnecting(false); if (onUpgrade) onUpgrade(); }}
        />
      )}
      {removing && (
        <ConfirmModal
          title={dc.unlinkTitle}
          body={fmt(dc.unlinkBody, { name: removing.guildName })}
          confirmLabel={dc.unlinkConfirm}
          cancelLabel={cm.cancel}
          onConfirm={() => unlink(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
      {bulk.dialog}
    </section>
  );
}

/* What the callback said: linked, or why not (with the bot's reason when it refused), in the
   viewer's language; at the plan's limit, the plan dialog for whoever can change it. */
function OutcomeNotice({ outcome, onUpgrade, onDismiss }: { outcome: LinkOutcome; onUpgrade: (() => void) | null; onDismiss: () => void }) {
  const t = useT();
  const dc = t.dash.discord;
  // A link that went through but left something for the member (its old key still live) warns.
  const warning = outcome.linked && outcome.warning ? dc.warnings[outcome.warning] : null;
  const text = outcome.linked
    ? (warning ? `${dc.linked} ${warning}` : dc.linked)
    : outcome.reason === "bot_refused" && outcome.detail
      ? `${dc.reasons.bot_refused} ${dc.refusals[outcome.detail]}`
      : dc.reasons[outcome.reason];
  return (
    <div className="note-bar arrive" role={outcome.linked && !warning ? "status" : "alert"}>
      <StatusIcon tone={outcome.linked ? (warning ? "wait" : "ok") : "fail"} size={20} />
      <span>{text}</span>
      {!outcome.linked && outcome.reason === "key_limit" && onUpgrade && <button type="button" className="btn btn-dark btn-sm note-bar-act" onClick={onUpgrade}>{t.dash.common.viewPlans}</button>}
      <button type="button" className={`icon-mini${!outcome.linked && outcome.reason === "key_limit" && onUpgrade ? "" : " note-bar-act"}`} title={dc.dismiss} aria-label={dc.dismiss} onClick={onDismiss}>
        <IcX />
      </button>
    </div>
  );
}

/* "Connect Discord", in two steps (a create is a dialog, a long form goes in steps): the network
   and one of the organization's wallets on it, then the asset. The environment is the dashboard's
   switch (the eyebrow names it), as for an API key. The last step opens Discord, where the person
   picks the server; the callback brings them back to Settings. */
function ConnectDiscordModal({ orgId, env, canConnectWallets, onClose, onLimit }: { orgId: string; env: "dev" | "prod"; canConnectWallets: boolean; onClose: () => void; onLimit: () => void }) {
  const t = useT();
  const dc = t.dash.discord;
  const steps = useFormSteps(2);
  const wallets = useOrgWallets(orgId);
  const [chain, setChain] = useState<NetworkId | "">("");
  const [address, setAddress] = useState("");
  const [asset, setAsset] = useState(DEFAULT_LINK_ASSET);
  const [busy, setBusy] = useState(false);

  // Start on the network of the organization's first wallet.
  useEffect(() => {
    if (!chain && Array.isArray(wallets)) setChain((wallets[0]?.chain as NetworkId) || "stellar");
  }, [wallets, chain]);
  const wallet = Array.isArray(wallets) ? wallets.find((w) => w.chain === chain && w.address === address) : undefined;
  const normalized = normalizeLinkAsset(asset);
  const assetBad = !!asset.trim() && !normalized;

  const submit = () => {
    if (!wallet || !normalized || busy) return;
    setBusy(true);
    orgsApi.discordInstall(orgId, { environment: env, walletId: wallet.id, asset: normalized })
      .then((answer) => {
        if (answer && typeof answer.url === "string" && /^(https:\/\/discord\.com\/|\/(?![/\\]))/.test(answer.url)) window.location.assign(answer.url);
        else { setBusy(false); showToast(dc.installError, "error"); }
      })
      .catch((err) => {
        setBusy(false);
        if (err && err.apiStatus === "plan_limit") { showToast(t.dash.apikeys.limitReached, "error"); onLimit(); return; }
        showToast(err && err.status === 403 ? dc.reasons.forbidden : err && err.status === 503 ? dc.reasons.not_configured : dc.installError, "error");
      });
  };

  return (
    <Modal onClose={onClose} label={dc.connectTitle}>
      <div className="modal-body">
        <div className="modal-eyebrow">{env === "prod" ? t.dash.env.production : t.dash.env.sandbox}</div>
        <h3>{dc.connectTitle}</h3>
        <FormSteps names={[dc.steps.wallet, dc.steps.asset]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (<>
            <div className="fld">
              <span className="field-l" id="discord-chain-l">{dc.network}</span>
              <Select
                id="discord-chain" labelledBy="discord-chain-l"
                value={chain} onChange={(v) => { setChain(v as NetworkId); setAddress(""); }}
                disabled={!chain}
                options={NETWORKS_BY_NAME.map((c) => ({ value: c, label: networkName(c), icon: <NetworkMark chain={c} size={22} /> }))}
              />
            </div>
            {chain && <WalletSelect id="discord-wallet" orgId={orgId} chain={chain} value={address} onChange={setAddress} canConnect={canConnectWallets} label={dc.wallet} />}
          </>)}
          {steps.step === 1 && (<>
            <Field label={dc.asset} hint={dc.assetHint} value={asset} onChange={(e: { target: { value: string } }) => setAsset(e.target.value)} placeholder={DEFAULT_LINK_ASSET} autoComplete="off" spellCheck={false} maxLength={160} aria-invalid={assetBad ? true : undefined} />
            {assetBad && <p className="field-err" role="alert">{dc.assetInvalid}</p>}
          </>)}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={!!wallet} onCancel={onClose} submitLabel={busy ? dc.opening : dc.continue} onSubmit={submit} busy={busy} submitDisabled={!wallet || !normalized} />
      </div>
    </Modal>
  );
}
