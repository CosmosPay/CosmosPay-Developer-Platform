/* ZkPaymentsView: private payments ("ZK payments" in code) as a service. One is paid with a
   confidential transfer on Cosmos Pay's confidential token (OpenZeppelin's stellar-confidential):
   the amount stays hidden on-chain. The merchant receives the amount minus the 0.01% commission; the
   payer pays on the private checkout (payments.cosmospay.lat/zk/{id}); the merchant's receiving
   account is one of the organization's Stellar wallets (Settings; the create dialog offers only
   those) with a confidential account, set up and managed in this view (ZkAccountPanel), which also
   preselects it as the recipient of a new payment. Testnet (the sandbox) only for now. */
import { useEffect, useMemo, useState } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { IcCopy } from "@/components/cosmos/icons";
import { zkPayments as zkApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, idempotencyKeys } from "@/components/cosmos/dashboard/helpers";
import { useListFilters } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { PAYMENTS } from "@/components/cosmos/lib/constants";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { fromUnits, toUnits, zkSplit } from "@/lib/zk/amounts";
import { parseZkConfig } from "@/lib/zk/checkout-api";
import { ZkAccountPanel } from "@/components/cosmos/dashboard/components/ZkAccountPanel";
import { useOrgWallets, WalletSelect } from "@/components/cosmos/dashboard/components/OrgWallets";

const STATUSES = ["PENDING", "SUCCEEDED", "EXPIRED"];
const PILL = { SUCCEEDED: "ok", EXPIRED: "fail", PENDING: "ref" };
const DEFAULTS = { q: "", status: "all", date: "any" };
const ALLOWED = { status: ["all", ...STATUSES] };
const EXPIRIES = [60, 1440, 10080];

const checkoutUrl = (id) => `${PAYMENTS}/zk/${id}`;
const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "-");

export function ZkPaymentsView({ canManage = false, canConnectWallets = false, orgId, env = "dev" }) {
  const t = useT();
  const z = t.zk;
  const fl = t.dash.filters;
  const [config, setConfig] = useState(undefined);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [account, setAccount] = useState(null);
  const wallets = useOrgWallets(orgId);
  const stellarWallets = useMemo(() => (wallets || []).filter((w) => w.chain === "stellar").map((w) => w.address), [wallets]);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  // Loads once the organization is known; an answer for an organization or environment the view
  // has since left is dropped, so a slow failure can never cover a newer list.
  useEffect(() => {
    if (!orgId) return;
    let current = true;
    setRows(null);
    setError(false);
    zkApi.config(orgId, env).then((c) => { if (current) setConfig(c && c.enabled ? c : null); }).catch(() => { if (current) setConfig(null); });
    zkApi.list(orgId, env, { take: 100 })
      .then((res) => { if (current) setRows(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (current) { setRows([]); setError(true); } });
    return () => { current = false; };
  }, [orgId, env]);

  const all = rows || [];
  const matches = (p, skip) =>
    (skip === "status" || filters.status === "all" || p.status === filters.status) &&
    inRange(p.createdAt, filters.date) &&
    matchesQuery([p.id, p.recipient, p.payer, p.amount, p.description], filters.q);
  const shown = all.filter((p) => matches(p, null));
  const statusCounts = countBy(all.filter((p) => matches(p, "status")), (p) => p.status);
  const zkConfig = useMemo(() => (config ? parseZkConfig(config) : null), [config]);

  const copy = (id) => navigator.clipboard?.writeText(checkoutUrl(id)).then(() => showToast(t.toasts.copied)).catch(() => {});

  return (
    <>
      <ViewHead title={z.title}>
        {canManage && config && <button type="button" className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {z.view.create}</button>}
      </ViewHead>
      {config === null && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{z.unavailable}</span></div>}
      {zkConfig && <ZkAccountPanel key={`${orgId}:${env}`} config={zkConfig} orgId={orgId} orgWallets={wallets === undefined ? null : stellarWallets} canConnectWallets={canConnectWallets} onAccount={setAccount} />}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={z.view.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: all.filter((p) => matches(p, "status")).length },
            ...STATUSES.map((st) => ({ key: st, label: z.status[st], count: statusCounts[st] || 0 })),
          ],
        }}
        date={filters.date} onDate={(v) => set("date", v)}
        shown={shown.length} total={all.length} active={active} onReset={reset} loading={rows === null}
      />
      <div className="panel">
        {rows === null && <TableSkeleton label={t.dash.cosmos.loading} />}
        {rows !== null && error && <div className="empty">{z.view.loadError}</div>}
        {rows !== null && !error && !all.length && <div className="empty">{z.view.empty}</div>}
        {rows !== null && !error && all.length > 0 && !shown.length && <div className="empty">{fl.noMatch}</div>}
        {shown.length > 0 && (
          <div className="t-scroll" tabIndex={0}>
            <table className="tx">
              <thead><tr><th>{z.view.tableHead.id}</th><th>{z.view.tableHead.amount}</th><th>{z.view.tableHead.net}</th><th>{z.view.tableHead.fee}</th><th>{z.view.tableHead.status}</th><th>{z.view.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td className="tid" title={p.id}>{p.description || short(p.id)}</td>
                    <td className="amt">{p.amount} XLM</td>
                    <td className="amt">{p.netAmount} XLM</td>
                    <td className="cust">{p.feeAmount} XLM</td>
                    <td><Pill st={PILL[p.status] || "ref"} label={z.status[p.status] || p.status} /></td>
                    <td className="cust">{fmtDateTime(p.createdAt)}</td>
                    <td className="row-actions">
                      <button type="button" className="icon-mini" title={z.view.copyLink} aria-label={z.view.copyLink} onClick={() => copy(p.id)}><IcCopy /></button>
                      <a className="icon-mini" href={checkoutUrl(p.id)} target="_blank" rel="noopener" title={z.view.openCheckout} aria-label={z.view.openCheckout}>{DI.link}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && config && (
        <CreateZkPaymentModal
          orgId={orgId} env={env} config={config} canConnectWallets={canConnectWallets} defaultRecipient={account && account.registered ? account.address : ""}
          onClose={() => setModal(false)}
          onCreated={(p) => { setRows((r) => [p, ...(r || [])]); }}
        />
      )}
    </>
  );
}

function CreateZkPaymentModal({ orgId, env, config, canConnectWallets, defaultRecipient = "", onClose, onCreated }) {
  const t = useT();
  const z = t.zk;
  const keys = useMemo(() => idempotencyKeys(), []);
  const [amount, setAmount] = useState("");
  // One of the organization's Stellar wallets: the panel's account when it is one, else the first.
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [description, setDescription] = useState("");
  const [expires, setExpires] = useState("1440");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [problem, setProblem] = useState(null);

  const units = (() => { try { return amount.trim() ? toUnits(amount) : null; } catch { return null; } })();
  const split = units && units > 0n ? zkSplit(units, config.feeBps) : null;
  const recipientOk = /^G[A-Z2-7]{55}$/.test(recipient.trim());
  const ok = !!split && split.net > 0n && recipientOk && !busy;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setProblem(null);
    const body = { org: orgId, environment: env, amount: amount.trim(), recipient: recipient.trim(), description: description.trim() || undefined, expiresInMinutes: Number(expires) };
    try {
      const p = await zkApi.create({ ...body, idempotencyKey: keys.keyFor(body) });
      setCreated(p);
      onCreated(p);
      showToast(z.modal.created);
    } catch (e) {
      setProblem(e && e.message ? e.message : t.dash.admin.loadError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} label={z.modal.title}>
      <div className="modal-body">
        <h3>{z.modal.title}</h3>
        {created ? (
          <div className="paylink-fields">
            <Field label={z.modal.link} value={checkoutUrl(created.id)} readOnly onFocus={(e) => e.target.select()} />
            <div className="modal-actions">
              <a className="btn btn-dark" href={checkoutUrl(created.id)} target="_blank" rel="noopener">{z.view.openCheckout}</a>
              <button type="button" className="btn btn-outline-w" onClick={onClose}>{z.account.done}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="fld">
              <div className="sp pl-amount">
                <div className="sp-top"><label htmlFor="zk-amount">{z.amount}</label></div>
                <div className="sp-row">
                  <input id="zk-amount" className="sp-amount" inputMode="decimal" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} aria-invalid={amount.trim() !== "" && units === null ? true : undefined} />
                  <span className="sp-unit">XLM</span>
                </div>
              </div>
            </div>
            {split && (
              <dl className="sq-rows zk-split">
                <div><dt>{z.merchantGets}</dt><dd>{fromUnits(split.net)} XLM</dd></div>
                <div><dt>{z.commission} ({z.commissionRate})</dt><dd>{fromUnits(split.fee)} XLM</dd></div>
              </dl>
            )}
            <WalletSelect id="zk-recipient" orgId={orgId} chain="stellar" value={recipient} onChange={setRecipient} canConnect={canConnectWallets} label={z.modal.recipient} hint={z.modal.recipientHint} />
            <Field label={z.modal.description} hint={t.dash.common.optional} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.dash.examples.order} maxLength={140} />
            <div className="fld">
              <span className="field-l" id="zk-expires-l">{z.modal.expires}</span>
              <Select labelledBy="zk-expires-l" value={expires} onChange={setExpires} options={EXPIRIES.map((m) => ({ value: String(m), label: z.modal.expiries[`m${m}`] }))} />
            </div>
            {problem && <p className="field-err" role="alert">{problem}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-dark" onClick={submit} disabled={!ok}>{busy ? z.modal.submitting : z.modal.submit}</button>
              <button type="button" className="btn btn-outline-w" onClick={onClose}>{t.dash.common.cancel}</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
