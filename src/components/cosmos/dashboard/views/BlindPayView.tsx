import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { kyc as kycApi, onramp as onrampApi, offramp as offrampApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { CountrySelect } from "@/components/cosmos/dashboard/components/CountrySelect";
import { CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";

/* ---- display constants (technical identifiers — intentionally not translated) ---- */
const RECEIVER_TYPES = ["individual", "business"];
const KYC_TYPES = ["light", "standard", "enhanced"];
const TOKENS = ["USDC", "USDT", "USDB"];
const CURRENCY_TYPES = ["sender", "receiver"];
const BOOL = ["no", "yes"];
const WALLET_NETWORKS = ["stellar", "stellar_testnet", "ethereum", "base", "arbitrum", "polygon", "solana", "tron"];
const PAYOUT_NETWORKS = ["stellar", "stellar_testnet", "ethereum", "base", "arbitrum", "polygon", "solana"];
const RAILS = ["ach", "wire", "rtp", "pix", "pix_safe", "ted", "spei_bitso", "transfers_bitso", "ach_cop_bitso", "international_swift", "sepa"];
const PAYIN_METHODS = ["ach", "wire", "pix", "ted", "spei", "transfers", "pse", "international_swift", "rtp"];

const chainOf = (net) => (net && net.indexOf("stellar") === 0 ? "stellar" : net && net.indexOf("solana") === 0 ? "solana" : "evm");

/* Map a provider status to a status-pill class. */
function statusPill(status) {
  const s = (status || "").toLowerCase();
  if (["approved", "verified", "completed", "complete", "paid", "settled", "success"].includes(s)) return "ok";
  if (["rejected", "denied", "failed", "cancelled", "canceled", "error"].includes(s)) return "fail";
  return "ref";
}

/* Humanize an unfamiliar status code so a raw value never reaches the UI:
   "on_hold" → "On hold", "funds_received" → "Funds received". */
function humanizeStatus(status) {
  const s = String(status || "").trim().replace(/[_-]+/g, " ");
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/* Readable label for a payin/payout (fiat transaction) status. Known BlindPay codes use
   the localized `txStatuses` catalog; anything else is humanized. Returns "" for an empty
   status so the caller can fall back to its own "unknown" label. */
function fiatStatusLabel(status, catalog) {
  const s = (status || "").toLowerCase();
  if (!s) return "";
  return (catalog && catalog[s]) || humanizeStatus(s);
}

/* Localized label for a receiver's KYC lifecycle status (inactive → pending_review →
   pending_user → BlindPay's verifying/approved/rejected). Unknown/other non-terminal
   values read as "Verifying". `r` is the t.dash.blindpay.receivers catalog. */
function kycLabel(status, r) {
  const s = (status || "").toLowerCase();
  const map = (r && r.statuses) || {};
  if (map[s]) return map[s];
  if (["approved", "verified", "completed", "complete"].includes(s)) return map.approved || status;
  if (["rejected", "denied", "failed"].includes(s)) return map.rejected || status;
  return map.verifying || status || (r && r.statusUnknown) || "—";
}
const onlyFilled = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));
const unwrap = (res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []);

/* ID document types (technical identifiers; "" = none chosen). */
const ID_DOC_TYPES = ["", "PASSPORT", "ID_CARD", "DRIVERS_LICENSE", "RESIDENCE_PERMIT"];
const ID_DOC_TYPE_LABELS = { "": "—" };

/* Receiver field groups by verification type/level — snake_case CreateReceiverDto
   field names. These groupings are UX only; the provider validates the real
   requirements, and empty fields are stripped before sending. */
const IND_ALL = ["first_name", "last_name", "date_of_birth", "tax_id", "phone_number", "address_line_1", "city", "state_province_region", "postal_code"];
const IND_STANDARD = ["id_doc_country", "id_doc_type", "id_doc_front_file", "id_doc_back_file", "selfie_file", "proof_of_address_doc_type", "proof_of_address_doc_file"];
const IND_ENHANCED = ["occupation", "account_purpose", "source_of_funds_doc_type", "source_of_funds_doc_file", "source_of_wealth", "purpose_of_transactions", "purpose_of_transactions_explanation"];
const BIZ_FIELDS = ["legal_name", "alternate_name", "business_type", "business_industry", "business_description", "formation_date", "estimated_annual_revenue", "website", "address_line_1", "city", "state_province_region", "postal_code", "incorporation_doc_file", "proof_of_ownership_doc_file"];
// A business needs at least one owner (UBO) with all of these filled.
const OWNER_REQUIRED = ["first_name", "last_name", "date_of_birth", "tax_id", "country", "id_doc_country", "id_doc_type", "id_doc_front_file"];
const DATE_KEYS = new Set(["date_of_birth", "formation_date"]);
// BlindPay rejects date-only values, so a "YYYY-MM-DD" picker value is sent as ISO datetime.
const toIsoDate = (d) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00.000Z` : d);

/* Document field. Two modes for the same value (the file_url BlindPay receives):
   - "Upload": POST the file (multipart FormData) to the kyc/upload proxy and store the
     returned { data: { file_url } }.
   - "Link": paste a URL directly — the pasted URL IS the file_url.
   A required *_file is satisfied by a non-empty value from either mode. */
function UploadField({ label, value, onChange, orgId, env, bp }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  // Default to "link" when the current value looks like a pasted URL (not a stored upload).
  const looksUrl = /^https?:\/\//i.test(value || "");
  const [mode, setMode] = useState(value && looksUrl && !name ? "link" : "upload");
  const upload = (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "onboarding");
    const qs = new URLSearchParams({ env: env || "dev" });
    if (orgId) qs.set("org", orgId);
    fetch(`/api/kyc/upload?${qs.toString()}`, { method: "POST", body: fd, credentials: "same-origin" })
      .then(async (res) => {
        let json = null;
        try { json = await res.json(); } catch (e) { /* non-JSON */ }
        if (!res.ok) throw new Error((json && json.message) || bp.uploadError);
        const url = json && json.data && json.data.file_url;
        if (!url) throw new Error(bp.uploadError);
        setName(file.name);
        onChange(url);
      })
      .catch((err) => showToast((err && err.message) || bp.uploadError, "error"))
      .finally(() => setBusy(false));
  };
  const clear = () => { setName(""); onChange(""); };
  return (
    <div className="fld">
      <label className="field-l">{label}</label>
      <div className="filter-tabs" style={{ marginBottom: 8 }}>
        <button type="button" className={mode === "upload" ? "on" : ""} onClick={() => setMode("upload")}>{bp.upload}</button>
        <button type="button" className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>{bp.linkMode}</button>
      </div>
      {mode === "link" ? (
        <input className="field" value={value || ""} onChange={(e) => { setName(""); onChange(e.target.value); }} placeholder="https://…" />
      ) : (
        <>
          <input ref={inputRef} type="file" style={{ display: "none" }} onChange={(e) => upload(e.target.files && e.target.files[0])} />
          <div className="paylink-actions" style={{ alignItems: "center" }}>
            {value
              ? (<>
                  <span className="field-note" style={{ wordBreak: "break-all" }}>{DI.docs} {name || (looksUrl ? value : bp.uploaded)}</span>
                  <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}>{busy ? bp.uploading : bp.replace}</button>
                </>)
              : (<button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}>{DI.download} {busy ? bp.uploading : bp.upload}</button>)}
          </div>
        </>
      )}
      {value && <div className="paylink-actions" style={{ marginTop: 6 }}><button type="button" className="btn btn-soft btn-sm danger-soft" onClick={clear}>{bp.clearFile}</button></div>}
    </div>
  );
}

/* One beneficial-owner (UBO) row inside the business receiver form. Defined at module
   scope so its inputs keep focus across the parent's re-renders. */
function OwnerRow({ owner, index, f, bp, orgId, env, t, onChange, onRemove }) {
  const setV = (k) => (v) => onChange(index, k, v);
  const setE = (k) => (e) => onChange(index, k, e.target.value);
  const g = (k) => owner[k] || "";
  return (
    <div className="paylink-block" style={{ marginBottom: 12 }}>
      <div className="paylink-block-head">
        <label className="field-l">{fmt(bp.receivers.modal.ownerN, { n: index + 1 })}</label>
        <button type="button" className="btn btn-soft btn-sm danger-soft" onClick={() => onRemove(index)}>{bp.receivers.modal.removeOwner}</button>
      </div>
      <Field label={f.first_name} value={g("first_name")} onChange={setE("first_name")} placeholder="Jane" />
      <Field label={f.last_name} value={g("last_name")} onChange={setE("last_name")} placeholder="Doe" />
      <Field label={f.date_of_birth} type="date" value={g("date_of_birth")} onChange={setE("date_of_birth")} />
      <Field label={f.tax_id} value={g("tax_id")} onChange={setE("tax_id")} />
      <CountrySelect label={f.country} value={g("country")} onChange={setV("country")} placeholder={bp.selectCountry} searchPlaceholder={bp.searchCountry} />
      <Field label={f.ownership_percentage} hint={t.dash.common.optional} value={g("ownership_percentage")} onChange={setE("ownership_percentage")} inputMode="numeric" placeholder="25" />
      <Field label={f.title} hint={t.dash.common.optional} value={g("title")} onChange={setE("title")} placeholder="Director" />
      <CountrySelect label={f.id_doc_country} value={g("id_doc_country")} onChange={setV("id_doc_country")} placeholder={bp.selectCountry} searchPlaceholder={bp.searchCountry} />
      <Sel label={f.id_doc_type} value={g("id_doc_type")} onChange={setV("id_doc_type")} options={ID_DOC_TYPES} labels={ID_DOC_TYPE_LABELS} />
      <UploadField label={f.id_doc_front_file} value={g("id_doc_front_file")} onChange={setV("id_doc_front_file")} orgId={orgId} env={env} bp={bp} />
    </div>
  );
}

export function BlindPayView({ canManage = true, orgId, orgRole, env = "dev" }) {
  const t = useT();
  const bp = t.dash.blindpay;
  const [tab, setTab] = useState("receivers");
  const tabs = ["receivers", "onramp", "offramp"];
  // Approving KYC is an owner/admin action on the active organization.
  const isManager = orgRole === "owner" || orgRole === "admin";

  return (
    <>
      <ViewHead title={bp.title} sub={bp.sub} />
      <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{canManage ? bp.gate : bp.readOnly}</span></div>
      <div className="filter-tabs">{tabs.map((k) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{bp.tabs[k]}</button>)}</div>
      {tab === "receivers" && <ReceiversTab bp={bp} orgId={orgId} env={env} canManage={canManage} isManager={isManager} />}
      {tab === "onramp" && <OnrampTab bp={bp} orgId={orgId} env={env} canManage={canManage} />}
      {tab === "offramp" && <OfframpTab bp={bp} orgId={orgId} env={env} canManage={canManage} />}
    </>
  );
}

/* ======================= Receivers (KYC/KYB) ======================= */
function ReceiversTab({ bp, orgId, env, canManage, isManager }) {
  const r = bp.receivers;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    kycApi.get("receivers", env, orgId)
      .then((res) => { setRows(unwrap(res)); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId]);
  useEffect(() => { load(); }, [load]);

  const onCreated = (rec) => { setModal(false); setRows((x) => [rec, ...x]); setDetail(rec); };
  const onUpdated = (rec) => { setRows((x) => x.map((i) => (i.id === rec.id ? { ...i, ...rec } : i))); setDetail((d) => (d && d.id === rec.id ? { ...d, ...rec } : d)); };

  const view = rows.filter((rec) => {
    if (!q) return true;
    const hay = `${rec.name || ""} ${rec.email || ""} ${rec.country || ""} ${rec.kycStatus || ""} ${rec.disabled ? "disabled" : ""} ${rec.id || ""} ${rec.blindpayId || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q);
  const tref = useRef(null); useGsapRows(tref, pg.page);

  return (
    <div className="panel">
      <Toolbar q={q} setQ={setQ} placeholder={r.searchPlaceholder}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {r.create}</button>}
      </Toolbar>
      {!loading && !error && view.length > 0 && (
        <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{r.tableHead.name}</th><th>{r.tableHead.type}</th><th>{r.tableHead.status}</th><th>{r.tableHead.created}</th></tr></thead>
          <tbody>{pg.slice.map((rec) => (
            <tr key={rec.id} className="row-click" onClick={() => setDetail(rec)}>
              <td>{rec.name || rec.email || rec.id}</td>
              <td className="cust">{(r.types && r.types[rec.type]) || rec.type || "—"}</td>
              <td>{rec.disabled ? <Pill st="fail" label={r.disabled} /> : <Pill st={statusPill(rec.kycStatus)} label={kycLabel(rec.kycStatus, r)} />}</td>
              <td className="cust">{fmtDateTime(rec.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {loading && <div className="empty">{bp.loading}</div>}
      {!loading && error && <div className="empty">{bp.loadError}</div>}
      {!loading && !error && !view.length && <div className="empty">{r.empty}</div>}
      {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      {modal && <CreateReceiverModal bp={bp} orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={onCreated} />}
      {detail && <ReceiverDetailModal bp={bp} receiver={detail} orgId={orgId} env={env} canManage={canManage} isManager={isManager} onClose={() => setDetail(null)} onUpdated={onUpdated} />}
    </div>
  );
}

function CreateReceiverModal({ bp, orgId, env, onClose, onCreated }) {
  const t = useT();
  const r = bp.receivers;
  const m = r.modal;
  const f = m.fields;
  const [type, setType] = useState("individual");
  const [kycType, setKycType] = useState("standard");
  const [form, setForm] = useState({});
  const [owners, setOwners] = useState([]);
  const [busy, setBusy] = useState(false);

  const isBiz = type === "business";
  const showStandard = !isBiz && (kycType === "standard" || kycType === "enhanced");
  const showEnhanced = !isBiz && kycType === "enhanced";

  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));
  const setE = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const get = (k) => form[k] || "";
  const filled = (k) => String(form[k] || "").trim() !== "";

  // Required fields per type + verification level — these must be present so BlindPay's
  // `enable` step never rejects the receiver. A required upload is satisfied once its
  // file_url is set; a required date is satisfied by the picker (sent as ISO datetime).
  const requiredKeys = new Set(
    isBiz
      ? ["legal_name", "business_type", "formation_date"]
      : ["first_name", "last_name", "date_of_birth", "tax_id", ...(showStandard ? ["id_doc_country", "id_doc_type", "id_doc_front_file", "selfie_file"] : [])],
  );
  const ownerComplete = (o) => OWNER_REQUIRED.every((k) => String((o && o[k]) || "").trim() !== "");
  const valid =
    filled("email") && filled("country") &&
    (isBiz
      ? (filled("legal_name") && filled("business_type") && filled("formation_date") && owners.some(ownerComplete))
      : [...requiredKeys].every(filled));

  // The visible fields depend on type and (for individuals) the verification level.
  const visibleKeys = isBiz ? BIZ_FIELDS : [...IND_ALL, ...(showStandard ? IND_STANDARD : []), ...(showEnhanced ? IND_ENHANCED : [])];

  // Plain functions (NOT inline components) so controlled inputs keep focus. Required
  // fields drop the "(optional)" hint.
  const renderField = (k) => {
    const opt = requiredKeys.has(k) ? undefined : t.dash.common.optional;
    if (k.endsWith("_file")) return <UploadField key={k} label={f[k]} value={get(k)} onChange={set(k)} orgId={orgId} env={env} bp={bp} />;
    if (DATE_KEYS.has(k)) return <Field key={k} label={f[k]} type="date" hint={opt} value={get(k)} onChange={setE(k)} />;
    if (k === "id_doc_country") return <CountrySelect key={k} label={f[k]} hint={opt} value={get(k)} onChange={set(k)} placeholder={bp.selectCountry} searchPlaceholder={bp.searchCountry} />;
    if (k === "id_doc_type") return <Sel key={k} label={f[k]} value={get(k)} onChange={set(k)} options={ID_DOC_TYPES} labels={ID_DOC_TYPE_LABELS} />;
    return <Field key={k} label={f[k]} hint={opt} value={get(k)} onChange={setE(k)} />;
  };

  const updateOwner = (i, k, v) => setOwners((o) => o.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const removeOwner = (i) => setOwners((o) => o.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!valid || busy) return;
    setBusy(true);
    const picked = {};
    for (const k of visibleKeys) if (form[k] !== undefined && form[k] !== "") picked[k] = form[k];
    if (picked.date_of_birth) picked.date_of_birth = toIsoDate(picked.date_of_birth);
    if (picked.formation_date) picked.formation_date = toIsoDate(picked.formation_date);
    if (picked.id_doc_country) picked.id_doc_country = String(picked.id_doc_country).toUpperCase();
    const ownersClean = owners
      .map((o) => {
        const x = { ...o };
        if (x.date_of_birth) x.date_of_birth = toIsoDate(x.date_of_birth);
        if (x.country) x.country = String(x.country).toUpperCase();
        if (x.id_doc_country) x.id_doc_country = String(x.id_doc_country).toUpperCase();
        if (x.ownership_percentage) x.ownership_percentage = Number(x.ownership_percentage);
        return onlyFilled(x);
      })
      .filter((o) => Object.keys(o).length > 0);
    const body = onlyFilled({
      type, kyc_type: kycType,
      email: get("email").trim(),
      country: get("country").trim().toUpperCase(),
      ...picked,
      ...(isBiz && ownersClean.length ? { owners: ownersClean } : {}),
    });
    kycApi.post("receivers", env, orgId, body)
      .then((rec) => onCreated(rec))
      .catch((err) => showToast((err && err.message) || r.createError, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <Sel label={m.type} value={type} onChange={setType} options={RECEIVER_TYPES} labels={{ individual: m.individual, business: m.business }} />
        <Sel label={m.kycType} value={kycType} onChange={setKycType} options={KYC_TYPES} />
        <Field label={f.email} type="email" value={get("email")} onChange={setE("email")} placeholder="jane@acme.com" autoFocus />
        <CountrySelect label={f.country} value={get("country")} onChange={set("country")} placeholder={bp.selectCountry} searchPlaceholder={bp.searchCountry} />
        {visibleKeys.map(renderField)}
        {isBiz && (
          <>
            <label className="field-l" style={{ marginTop: 8 }}>{m.ownersTitle}</label>
            {owners.map((o, i) => <OwnerRow key={i} owner={o} index={i} f={f} bp={bp} orgId={orgId} env={env} t={t} onChange={updateOwner} onRemove={removeOwner} />)}
            <div className="paylink-actions" style={{ marginBottom: 8 }}>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setOwners((o) => [...o, {}])}>{DI.plus} {m.addOwner}</button>
            </div>
          </>
        )}
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!valid || busy} onClick={submit}>{busy ? m.creating : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

function ReceiverDetailModal({ bp, receiver, orgId, env, canManage, isManager, onClose, onUpdated }) {
  const t = useT();
  const r = bp.receivers;
  const dt = r.detail;
  const [data, setData] = useState(receiver);
  const [wallets, setWallets] = useState(null);
  const [banks, setBanks] = useState(null);
  const [addWallet, setAddWallet] = useState(false);
  const [addBank, setAddBank] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // KYC lifecycle: inactive → pending_review → pending_user → (BlindPay) verifying/
  // approved/rejected. Wallets and bank accounts need the real provider receiver, so
  // they only appear once the customer has accepted and it exists at BlindPay.
  const status = (data.kycStatus || "").toLowerCase();
  const isInactive = status === "inactive";
  const isPendingReview = status === "pending_review";
  const isPendingUser = status === "pending_user";
  const atProvider = !isInactive && !isPendingReview && !isPendingUser;
  const disabled = !!data.disabled;

  const loadWallets = useCallback(() => { kycApi.get(`receivers/${data.id}/wallets`, env, orgId).then((res) => setWallets(unwrap(res))).catch(() => setWallets([])); }, [data.id, env, orgId]);
  const loadBanks = useCallback(() => { kycApi.get(`receivers/${data.id}/bank-accounts`, env, orgId).then((res) => setBanks(unwrap(res))).catch(() => setBanks([])); }, [data.id, env, orgId]);
  useEffect(() => { if (atProvider) { loadWallets(); loadBanks(); } }, [atProvider, loadWallets, loadBanks]);

  const applyUpdate = (rec) => { const next = { ...data, ...(rec || {}) }; setData(next); if (onUpdated) onUpdated(next); };

  // Keep the latest onUpdated reachable without re-arming the live refresh each parent render.
  const onUpdatedRef = useRef(onUpdated);
  useEffect(() => { onUpdatedRef.current = onUpdated; });

  // Pull the live KYC status from BlindPay. GET receivers/:id refreshes from the provider and
  // falls back to the last-known ("return") status server-side, so on failure we simply keep
  // what we have. For pre-provider states (inactive/pending_review/pending_user) the server
  // returns the local row unchanged — no provider round-trip.
  const refresh = (opts = {}) => {
    setRefreshing(true);
    return kycApi.get(`receivers/${receiver.id}`, env, orgId)
      .then((rec) => {
        if (!rec || typeof rec !== "object") return;
        setData((d) => ({ ...d, ...rec }));
        if (onUpdatedRef.current) onUpdatedRef.current({ ...receiver, ...rec });
      })
      .catch(() => { if (opts.toast) showToast(r.refreshError, "error"); })
      .finally(() => setRefreshing(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [receiver.id, env, orgId]);

  const fields = [
    [dt.id, data.id],
    [dt.blindpayId, data.blindpayId],
    [dt.kycStatus, kycLabel(data.kycStatus, r)],
    [dt.kycType, data.kycType],
    [dt.email, data.email],
    [dt.country, data.country],
  ].filter(([, v]) => v);

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{dt.eyebrow}</div>
        <h3>{data.name || data.email || data.id}</h3>
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {disabled ? <Pill st="fail" label={r.disabled} /> : <Pill st={statusPill(data.kycStatus)} label={kycLabel(data.kycStatus, r)} />}
          <button type="button" className="btn btn-soft btn-sm" disabled={refreshing} onClick={() => refresh({ toast: true })}>{refreshing ? r.refreshing : r.refresh}</button>
        </div>
        {disabled && <p className="field-note" style={{ marginTop: -6, marginBottom: 12 }}>{r.disabledNote}</p>}
        <div className="paylink-fields">{fields.map(([k, v]) => <CopyField key={k} label={k} value={v} />)}</div>

        {isManager && (disabled || atProvider) && <FiatAccessToggle r={r} receiver={data} orgId={orgId} env={env} onChanged={applyUpdate} />}

        {isInactive && <p className="field-note" style={{ marginTop: 12 }}>{r.inactiveNote}</p>}

        {isPendingReview && (
          isManager
            ? <ApproveReceiver r={r} receiver={data} orgId={orgId} env={env} onApproved={applyUpdate} />
            : <p className="field-note" style={{ marginTop: 12 }}>{r.awaitingReview}</p>
        )}

        {isPendingUser && (
          <div className="paylink-block" style={{ marginTop: 12 }}>
            <div className="paylink-block-head"><label className="field-l">{r.termsSentTitle}</label></div>
            <p className="field-note">{data.email ? fmt(r.termsSentBody, { email: data.email }) : r.termsSentBodyNoEmail}</p>
            {isManager && <ResendTerms r={r} receiver={data} orgId={orgId} env={env} />}
          </div>
        )}

        {atProvider && (
          <>
            {/* Wallets */}
            <label className="field-l">{dt.wallets}</label>
            {wallets === null && <div className="empty">{bp.loading}</div>}
            {wallets !== null && wallets.length === 0 && <div className="empty">{dt.noWallets}</div>}
            {wallets !== null && wallets.length > 0 && (
              <div className="t-scroll"><table className="tx"><tbody>{wallets.map((w) => (
                <tr key={w.id}><td className="cust">{w.name || w.id}</td><td className="cust">{w.network}</td><td className="tid">{w.address || "—"}</td></tr>
              ))}</tbody></table></div>
            )}
            {canManage && !disabled && (addWallet
              ? <AddWalletForm bp={bp} receiver={data} orgId={orgId} env={env} onClose={() => setAddWallet(false)} onAdded={() => { setAddWallet(false); loadWallets(); }} />
              : <div className="paylink-actions" style={{ margin: "8px 0 18px" }}><button className="btn btn-soft btn-sm" onClick={() => setAddWallet(true)}>{DI.plus} {dt.addWallet}</button></div>)}

            {/* Bank accounts */}
            <label className="field-l">{dt.banks}</label>
            {banks === null && <div className="empty">{bp.loading}</div>}
            {banks !== null && banks.length === 0 && <div className="empty">{dt.noBanks}</div>}
            {banks !== null && banks.length > 0 && (
              <div className="t-scroll"><table className="tx"><tbody>{banks.map((b) => (
                <tr key={b.id}><td className="cust">{b.name || b.id}</td><td className="cust">{b.rail}</td><td className="cust">{b.country || "—"}</td></tr>
              ))}</tbody></table></div>
            )}
            {canManage && !disabled && (addBank
              ? <AddBankForm bp={bp} receiver={data} orgId={orgId} env={env} onClose={() => setAddBank(false)} onAdded={() => { setAddBank(false); loadBanks(); }} />
              : <div className="paylink-actions" style={{ margin: "8px 0" }}><button className="btn btn-soft btn-sm" onClick={() => setAddBank(true)}>{DI.plus} {dt.addBank}</button></div>)}
          </>
        )}

        <div className="modal-actions"><button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button></div>
      </div>
    </Modal>
  );
}

/* Owner/admin review of a pending_review receiver. Approving asks the backend to email
   the CUSTOMER BlindPay's terms link (returning to /kyc/return/:org/:env/:receiver,
   which enables the account once they accept). The reviewer never goes to BlindPay. */
function ApproveReceiver({ r, receiver, orgId, env, onApproved }) {
  const [busy, setBusy] = useState(false);
  const redirectUrl = `${window.location.origin}/kyc/return/${encodeURIComponent(orgId)}/${env}/${encodeURIComponent(receiver.id)}`;
  const approve = () => {
    if (busy) return;
    setBusy(true);
    kycApi.post(`receivers/${receiver.id}/approve`, env, orgId, { redirect_url: redirectUrl })
      .then((rec) => { showToast(fmt(r.approvedSent, { email: (rec && rec.email) || receiver.email || "" })); onApproved(rec || { kycStatus: "pending_user" }); })
      .catch((err) => showToast((err && err.message) || r.approveError, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <div className="paylink-block" style={{ marginTop: 12 }}>
      <div className="paylink-block-head"><label className="field-l">{r.reviewTitle}</label></div>
      <p className="field-note">{r.reviewHint}</p>
      <div className="modal-actions">
        <button className="btn btn-violet" disabled={busy} onClick={approve}>{DI.docs} {busy ? r.approving : r.approve}</button>
      </div>
    </div>
  );
}

/* Resend the KYC verification (terms-of-service acceptance) email to a pending_user customer
   from our panel — owner/admin only. Accepting the emailed terms is the step that kicks off
   BlindPay's verification, so this is the "resend KYC verification email" action. The provider
   enforces a once-per-day limit; that error surfaces via showToast. */
function ResendTerms({ r, receiver, orgId, env }) {
  const [busy, setBusy] = useState(false);
  const redirectUrl = `${window.location.origin}/kyc/return/${encodeURIComponent(orgId)}/${env}/${encodeURIComponent(receiver.id)}`;
  const resend = () => {
    if (busy) return;
    setBusy(true);
    kycApi.post(`receivers/${receiver.id}/tos`, env, orgId, { channel: "email", redirect_url: redirectUrl })
      .then((res) => showToast(fmt(r.verificationSent, { email: (res && res.email) || receiver.email || "" })))
      .catch((err) => showToast((err && err.message) || r.emailTosError, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <div className="modal-actions">
      <button className="btn btn-soft" disabled={busy} onClick={resend}>{busy ? r.sending : r.resendVerification}</button>
    </div>
  );
}

/* Owner/admin enable/disable toggle for a fiat receiver. A disabled receiver blocks
   onramp/offramp (the backend refuses quotes/wallets/bank-accounts). */
function FiatAccessToggle({ r, receiver, orgId, env, onChanged }) {
  const [busy, setBusy] = useState(false);
  const disabled = !!receiver.disabled;
  const toggle = () => {
    if (busy) return;
    setBusy(true);
    kycApi.patch(`receivers/${receiver.id}/access`, env, orgId, { disabled: !disabled })
      .then((rec) => {
        showToast(disabled ? r.accountEnabled : r.accountDisabled);
        onChanged({ ...(rec && typeof rec === "object" ? rec : {}), disabled: !disabled });
      })
      .catch((err) => showToast((err && err.message) || r.accessError, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <div className="paylink-actions" style={{ margin: "8px 0 14px" }}>
      {disabled
        ? <button className="btn btn-violet btn-sm" disabled={busy} onClick={toggle}>{r.enableAccount}</button>
        : <button className="btn btn-soft btn-sm danger-soft" disabled={busy} onClick={toggle}>{r.disableAccount}</button>}
    </div>
  );
}

function AddWalletForm({ bp, receiver, orgId, env, onClose, onAdded }) {
  const t = useT();
  const w = bp.receivers.wallet;
  const [name, setName] = useState("Primary wallet");
  const [network, setNetwork] = useState("stellar");
  const [address, setAddress] = useState("");
  const [aa, setAa] = useState("yes");
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && network && address.trim();
  const submit = () => {
    if (!valid || busy) return;
    setBusy(true);
    kycApi.post(`receivers/${receiver.id}/wallets`, env, orgId, onlyFilled({ name: name.trim(), network, address: address.trim(), is_account_abstraction: aa === "yes" }))
      .then(() => onAdded())
      .catch((err) => showToast((err && err.message) || w.error, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <div className="paylink-block" style={{ marginBottom: 18 }}>
      <Field label={w.name} value={name} onChange={(e) => setName(e.target.value)} />
      <Sel label={w.network} value={network} onChange={setNetwork} options={WALLET_NETWORKS} />
      <Field label={w.address} hint={w.addressHint} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="G…" />
      <Sel label={w.aa} value={aa} onChange={setAa} options={BOOL} labels={{ yes: t.dash.common.yes, no: t.dash.common.no }} />
      <div className="modal-actions">
        <button className="btn btn-violet btn-sm" disabled={!valid || busy} onClick={submit}>{w.add}</button>
        <button className="btn btn-soft btn-sm" onClick={onClose}>{t.dash.common.cancel}</button>
      </div>
    </div>
  );
}

function AddBankForm({ bp, receiver, orgId, env, onClose, onAdded }) {
  const t = useT();
  const b = bp.receivers.bank;
  const [type, setType] = useState("ach");
  const [name, setName] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [country, setCountry] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = type && name.trim();
  const submit = () => {
    if (!valid || busy) return;
    setBusy(true);
    kycApi.post(`receivers/${receiver.id}/bank-accounts`, env, orgId, onlyFilled({
      type, name: name.trim(), beneficiary_name: beneficiary.trim(), country: country.trim().toUpperCase(),
      account_number: accountNumber.trim(), routing_number: routingNumber.trim(),
    }))
      .then(() => onAdded())
      .catch((err) => showToast((err && err.message) || b.error, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <div className="paylink-block">
      <Sel label={b.rail} value={type} onChange={setType} options={RAILS} />
      <Field label={b.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme payouts — USD" />
      <Field label={b.beneficiary} hint={t.dash.common.optional} value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Jane Doe" />
      <CountrySelect label={b.country} hint={t.dash.common.optional} value={country} onChange={setCountry} placeholder={bp.selectCountry} searchPlaceholder={bp.searchCountry} />
      <Field label={b.accountNumber} hint={t.dash.common.optional} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="0123456789" />
      <Field label={b.routingNumber} hint={t.dash.common.optional} value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} placeholder="021000021" />
      <div className="modal-actions">
        <button className="btn btn-violet btn-sm" disabled={!valid || busy} onClick={submit}>{b.add}</button>
        <button className="btn btn-soft btn-sm" onClick={onClose}>{t.dash.common.cancel}</button>
      </div>
    </div>
  );
}

/* ======================= Onramp (fiat → stablecoin) ======================= */
function OnrampTab({ bp, orgId, env, canManage }) {
  const o = bp.onramp;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    onrampApi.get("payins", env, orgId)
      .then((res) => { setRows(unwrap(res)); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId]);
  useEffect(() => { load(); }, [load]);

  const view = rows.filter((p) => {
    if (!q) return true;
    const hay = `${p.id || ""} ${p.status || ""} ${p.token || ""} ${p.network || ""} ${p.paymentMethod || ""} ${p.currencyType || ""} ${p.senderAmount ?? ""} ${p.receiverAmount ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q);
  const tref = useRef(null); useGsapRows(tref, pg.page);

  return (
    <div className="panel">
      <Toolbar q={q} setQ={setQ} placeholder={o.searchPlaceholder}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {o.create}</button>}
      </Toolbar>
      {!loading && !error && view.length > 0 && (
        <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{o.tableHead.id}</th><th>{o.tableHead.asset}</th><th>{o.tableHead.method}</th><th>{o.tableHead.amount}</th><th>{o.tableHead.status}</th><th>{o.tableHead.created}</th></tr></thead>
          <tbody>{pg.slice.map((p) => (
            <tr key={p.id}>
              <td className="tid">{p.id}</td>
              <td className="cust">{p.token || "—"}{p.network ? ` · ${p.network}` : ""}</td>
              <td className="cust">{p.paymentMethod || "—"}</td>
              <td className="amt">{p.senderAmount ?? "—"} → {p.receiverAmount ?? "—"}</td>
              <td><Pill st={statusPill(p.status)} label={fiatStatusLabel(p.status, bp.txStatuses) || o.statusUnknown} /></td>
              <td className="cust">{fmtDateTime(p.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {loading && <div className="empty">{bp.loading}</div>}
      {!loading && error && <div className="empty">{bp.loadError}</div>}
      {!loading && !error && !view.length && <div className="empty">{o.empty}</div>}
      {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      {modal && <NewPayinModal bp={bp} orgId={orgId} env={env} onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} />}
    </div>
  );
}

function NewPayinModal({ bp, orgId, env, onClose, onDone }) {
  const t = useT();
  const o = bp.onramp;
  const m = o.modal;
  const [walletId, setWalletId] = useState("");
  const [currencyType, setCurrencyType] = useState("sender");
  const [method, setMethod] = useState("pix");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [payin, setPayin] = useState(null);
  const [busy, setBusy] = useState(false);

  const validQuote = walletId.trim() && amount.trim() && Number(amount) > 0;

  const getQuote = () => {
    if (!validQuote || busy) return;
    setBusy(true);
    onrampApi.post("quotes", env, orgId, {
      blockchain_wallet_id: walletId.trim(), currency_type: currencyType, payment_method: method, token, request_amount: Math.round(Number(amount)),
    })
      .then((qt) => setQuote(qt))
      .catch((err) => showToast((err && err.message) || o.quoteError, "error"))
      .finally(() => setBusy(false));
  };

  const createPayin = () => {
    if (!quote || busy) return;
    setBusy(true);
    onrampApi.post("payins", env, orgId, { payin_quote_id: quote.id })
      .then((p) => { setPayin(p); showToast(o.created); })
      .catch((err) => showToast((err && err.message) || o.createError, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        {!payin && (
          <>
            <Field label={m.walletId} hint={m.walletIdHint} value={walletId} onChange={(e) => { setWalletId(e.target.value); setQuote(null); }} placeholder="clz9x… / bw_…" autoFocus />
            <Sel label={m.method} value={method} onChange={(v) => { setMethod(v); setQuote(null); }} options={PAYIN_METHODS} />
            <Sel label={m.token} value={token} onChange={(v) => { setToken(v); setQuote(null); }} options={TOKENS} />
            <Sel label={m.currencyType} value={currencyType} onChange={(v) => { setCurrencyType(v); setQuote(null); }} options={CURRENCY_TYPES} labels={{ sender: m.curSender, receiver: m.curReceiver }} />
            <Field label={m.amount} hint={m.amountHint} value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} placeholder="10000" inputMode="numeric" />
            <div className="paylink-actions" style={{ marginBottom: 12 }}>
              <button className="btn btn-soft btn-sm" disabled={!validQuote || busy} onClick={getQuote}>{busy && !quote ? m.quoting : m.getQuote}</button>
            </div>
            {quote && (
              <div className="paylink-fields" style={{ marginBottom: 14 }}>
                <CopyField label={m.quoteId} value={quote.id} />
                {quote.sender_amount != null && <CopyField label={m.youSend} value={String(quote.sender_amount)} />}
                {quote.receiver_amount != null && <CopyField label={m.youReceive} value={String(quote.receiver_amount)} />}
                {quote.expires_at != null && <CopyField label={m.expires} value={fmtDateTime(quote.expires_at * 1000)} />}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!quote || busy} onClick={createPayin}>{busy && quote ? m.creating : m.create}</button>
              <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
            </div>
          </>
        )}
        {payin && (
          <>
            <div className="paylink-fields" style={{ marginBottom: 12 }}>
              <CopyField label={m.payinId} value={payin.id} />
              {payin.status && <CopyField label={m.status} value={fiatStatusLabel(payin.status, bp.txStatuses) || payin.status} />}
            </div>
            {payin.instructions && <CopyBlock label={m.instructions} value={typeof payin.instructions === "string" ? payin.instructions : JSON.stringify(payin.instructions, null, 2)} />}
            <div className="modal-actions"><button className="btn btn-violet" onClick={onDone}>{m.done}</button></div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ======================= Offramp (stablecoin → fiat) ======================= */
function OfframpTab({ bp, orgId, env, canManage }) {
  const o = bp.offramp;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    offrampApi.get("payouts", env, orgId)
      .then((res) => { setRows(unwrap(res)); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId]);
  useEffect(() => { load(); }, [load]);

  const view = rows.filter((p) => {
    if (!q) return true;
    const hay = `${p.id || ""} ${p.status || ""} ${p.token || ""} ${p.network || ""} ${p.rail || ""} ${p.senderAmount ?? ""} ${p.receiverAmount ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q);
  const tref = useRef(null); useGsapRows(tref, pg.page);

  return (
    <div className="panel">
      <Toolbar q={q} setQ={setQ} placeholder={o.searchPlaceholder}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {o.create}</button>}
      </Toolbar>
      {!loading && !error && view.length > 0 && (
        <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{o.tableHead.id}</th><th>{o.tableHead.asset}</th><th>{o.tableHead.rail}</th><th>{o.tableHead.amount}</th><th>{o.tableHead.status}</th><th>{o.tableHead.created}</th></tr></thead>
          <tbody>{pg.slice.map((p) => (
            <tr key={p.id}>
              <td className="tid">{p.id}</td>
              <td className="cust">{p.token || "—"}{p.network ? ` · ${p.network}` : ""}</td>
              <td className="cust">{p.rail || "—"}</td>
              <td className="amt">{p.senderAmount ?? "—"} → {p.receiverAmount ?? "—"}</td>
              <td><Pill st={statusPill(p.status)} label={fiatStatusLabel(p.status, bp.txStatuses) || o.statusUnknown} /></td>
              <td className="cust">{fmtDateTime(p.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {loading && <div className="empty">{bp.loading}</div>}
      {!loading && error && <div className="empty">{bp.loadError}</div>}
      {!loading && !error && !view.length && <div className="empty">{o.empty}</div>}
      {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      {modal && <NewPayoutModal bp={bp} orgId={orgId} env={env} onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} />}
    </div>
  );
}

function NewPayoutModal({ bp, orgId, env, onClose, onDone }) {
  const t = useT();
  const o = bp.offramp;
  const m = o.modal;
  const [bankId, setBankId] = useState("");
  const [currencyType, setCurrencyType] = useState("sender");
  const [coverFees, setCoverFees] = useState("no");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("stellar");
  const [token, setToken] = useState("USDC");
  const [senderWallet, setSenderWallet] = useState("");
  const [quote, setQuote] = useState(null);
  const [authTx, setAuthTx] = useState(null);   // unsigned tx (stellar)
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);

  const chain = chainOf(network);
  const validQuote = bankId.trim() && amount.trim() && Number(amount) > 0;
  const validWallet = senderWallet.trim();

  const getQuote = () => {
    if (!validQuote || busy) return;
    setBusy(true);
    offrampApi.post("quotes", env, orgId, {
      bank_account_id: bankId.trim(), currency_type: currencyType, cover_fees: coverFees === "yes",
      request_amount: Math.round(Number(amount)), network, token,
    })
      .then((qt) => setQuote(qt))
      .catch((err) => showToast((err && err.message) || o.quoteError, "error"))
      .finally(() => setBusy(false));
  };

  // Stellar/Solana: ask BlindPay to build the unsigned tx to sign.
  const authorize = () => {
    if (!quote || !validWallet || busy) return;
    setBusy(true);
    offrampApi.post("payouts/authorize", env, orgId, { quote_id: quote.id, sender_wallet_address: senderWallet.trim(), chain })
      .then((res) => {
        const tx = res && (res.transaction || res.unsigned_transaction || res.raw_transaction || res.xdr || res.tx);
        setAuthTx(tx || JSON.stringify(res, null, 2));
      })
      .catch((err) => showToast((err && err.message) || o.authError, "error"))
      .finally(() => setBusy(false));
  };

  const createPayout = () => {
    if (!quote || !validWallet || busy) return;
    setBusy(true);
    const body = onlyFilled({ quote_id: quote.id, sender_wallet_address: senderWallet.trim(), chain, signed_transaction: signed.trim() });
    offrampApi.post("payouts", env, orgId, body)
      .then(() => { showToast(o.created); onDone(); })
      .catch((err) => showToast((err && err.message) || o.createError, "error"))
      .finally(() => setBusy(false));
  };

  const isStellarLike = chain === "stellar" || chain === "solana";

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <Field label={m.bankId} hint={m.bankIdHint} value={bankId} onChange={(e) => { setBankId(e.target.value); setQuote(null); setAuthTx(null); }} placeholder="clz9x… / ba_…" autoFocus />
        <Sel label={m.network} value={network} onChange={(v) => { setNetwork(v); setQuote(null); setAuthTx(null); }} options={PAYOUT_NETWORKS} />
        <Sel label={m.token} value={token} onChange={(v) => { setToken(v); setQuote(null); }} options={TOKENS} />
        <Sel label={m.currencyType} value={currencyType} onChange={(v) => { setCurrencyType(v); setQuote(null); }} options={CURRENCY_TYPES} labels={{ sender: m.curSender, receiver: m.curReceiver }} />
        <Sel label={m.coverFees} value={coverFees} onChange={(v) => { setCoverFees(v); setQuote(null); }} options={BOOL} labels={{ yes: t.dash.common.yes, no: t.dash.common.no }} />
        <Field label={m.amount} hint={m.amountHint} value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }} placeholder="10000" inputMode="numeric" />
        <div className="paylink-actions" style={{ marginBottom: 12 }}>
          <button className="btn btn-soft btn-sm" disabled={!validQuote || busy} onClick={getQuote}>{m.getQuote}</button>
        </div>

        {quote && (
          <>
            <div className="paylink-fields" style={{ marginBottom: 12 }}>
              <CopyField label={m.quoteId} value={quote.id} />
              {quote.sender_amount != null && <CopyField label={m.youSend} value={String(quote.sender_amount)} />}
              {quote.receiver_local_amount != null && <CopyField label={m.youReceive} value={String(quote.receiver_local_amount)} />}
              {quote.expires_at != null && <CopyField label={m.expires} value={fmtDateTime(quote.expires_at * 1000)} />}
            </div>
            <Field label={m.senderWallet} hint={m.senderWalletHint} value={senderWallet} onChange={(e) => setSenderWallet(e.target.value)} placeholder="G… / 0x…" />

            {isStellarLike ? (
              <>
                <div className="paylink-actions" style={{ marginBottom: 12 }}>
                  <button className="btn btn-soft btn-sm" disabled={!validWallet || busy} onClick={authorize}>{m.authorize}</button>
                </div>
                {authTx && <CopyBlock label={m.unsignedTx} value={authTx} />}
                {authTx && (
                  <div className="paylink-block">
                    <div className="paylink-block-head"><label className="field-l">{m.signedTx}</label></div>
                    <p className="field-note">{m.signedTxHint}</p>
                    <textarea className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={m.signedTxPlaceholder} />
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn btn-violet" disabled={!authTx || !signed.trim() || busy} onClick={createPayout}>{busy ? m.creating : m.create}</button>
                  <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
                </div>
              </>
            ) : (
              <>
                <p className="field-note">{m.evmNote}</p>
                <div className="modal-actions">
                  <button className="btn btn-violet" disabled={!validWallet || busy} onClick={createPayout}>{busy ? m.creating : m.create}</button>
                  <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
