/* TransferAccountCard: QR charges' "Bank transfers" (product owner, 2026-11-12: the money a payer
   transfers must land in the seller's own account, not Cosmos Pay's). The organization activates
   its own receiving account once: its tax details go to the payment provider, which verifies them
   on a form it hosts; once approved, the account has an alias and a CVU in the organization's name
   and every charge in pesos can be paid by bank transfer to it. The provider is never named.

   One card per environment, under the view's figures: its status as coloured text, what that
   status needs (activate, finish the verification and refresh, nothing, try again) and, once
   active, the alias and the CVU to copy. Activating is a dialog in three steps (the holder, how to
   reach them, where they are) and needs `payments:create`; everyone else sees the status. The
   account is read through the /api/onramp proxy (`transfer/account`), checked by
   src/lib/transfer-account.ts, and read again every 30 s while the verification runs. */
import { useCallback, useEffect, useState } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { onramp } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { groupCvu } from "@/lib/payments/fiat-request";
import {
  TRANSFER_ACCOUNT_TYPES, birthDateProblem, emailOk, emptyTransferAccountDraft, parseTransferAccount, phoneOk, postalCodeOk,
  taxIdProblem, transferAccountBody, transferAccountCanStart, transferAccountStepOk, transferAccountWaiting,
  type TransferAccount, type TransferAccountDraft, type TransferAccountStatus,
} from "@/lib/transfer-account";

const PATH = "transfer/account";
/* While the verification runs, the card reads the account again this often (the server refreshes
   the form's link at most every 30 s). */
const WAITING_POLL_MS = 30_000;

/* The status's colour: done, waiting, off, failed (the Payments table's pill colours). */
const TONE: Record<TransferAccountStatus, string> = { none: "ref", pending: "pend", in_review: "pend", approved: "ok", rejected: "fail" };

export function TransferAccountCard({ canManage, orgId, env, onApproved }: {
  canManage: boolean;
  orgId: string;
  env: string;
  /** The account turned approved while on screen: new charges take bank transfers. */
  onApproved?: () => void;
}) {
  const t = useT();
  const a = t.dash.charges.transfers;
  // undefined while it loads, null when it could not be read.
  const [account, setAccount] = useState<TransferAccount | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState(false);

  const read = useCallback(async (quiet = false) => {
    try {
      const parsed = parseTransferAccount(await onramp.get(PATH, env, orgId));
      setAccount((prev) => {
        if (prev && prev.status !== "approved" && parsed?.status === "approved") onApproved?.();
        return parsed ?? (quiet && prev ? prev : null);
      });
    } catch {
      setAccount((prev) => (quiet && prev ? prev : null));
    }
  }, [env, orgId, onApproved]);

  useEffect(() => {
    setAccount(undefined);
    void read();
  }, [read]);

  // Verification running: read it again now and then, while the tab is visible.
  const waiting = !!account && transferAccountWaiting(account.status);
  useEffect(() => {
    if (!waiting) return;
    const h = setInterval(() => { if (!document.hidden) void read(true); }, WAITING_POLL_MS);
    return () => clearInterval(h);
  }, [waiting, read]);

  const refresh = async () => {
    setRefreshing(true);
    await read(true);
    setRefreshing(false);
  };

  return (
    <section className="panel tacc" aria-labelledby="tacc-title" aria-busy={account === undefined}>
      <span className="tacc-icon" aria-hidden="true">{DI.bank}</span>
      <div className="tacc-main">
        <div className="tacc-head">
          <h2 id="tacc-title">{a.title}</h2>
          {account && <span className={`pill-st ${TONE[account.status]} tacc-st`}>{a.status[account.status]}</span>}
        </div>
        {account === undefined && <div className="tacc-sk" aria-label={a.loading}><Sk w="70%" /></div>}
        {account === null && <p className="tacc-text field-err" role="alert">{a.loadError}</p>}
        {account && (
          <div className="tacc-body arrive" role="status" aria-live="polite">
            <p className="tacc-text">
              {account.status === "rejected" && account.reason ? fmt(a.text.rejectedWhy, { reason: account.reason }) : a.text[account.status]}
            </p>
            {account.status === "approved" && <ApprovedAccount account={account} />}
            {waiting && account.updatedAt && <p className="tacc-meta">{fmt(a.since, { date: fmtDateTime(account.updatedAt) })}</p>}
          </div>
        )}
      </div>
      {account && (
        <div className="tacc-actions">
          {transferAccountCanStart(account.status) && canManage && (
            <button type="button" className="btn btn-dark btn-sm" onClick={() => setActivating(true)}>
              {account.status === "rejected" ? a.tryAgain : a.activate}
            </button>
          )}
          {waiting && account.verificationUrl && (
            <a className="btn btn-dark btn-sm" href={account.verificationUrl} target="_blank" rel="noopener noreferrer">{a.finish}</a>
          )}
          {waiting && (
            <button type="button" className="btn btn-soft btn-sm" onClick={refresh} disabled={refreshing} aria-busy={refreshing}>{DI.refresh} {a.refresh}</button>
          )}
        </div>
      )}
      {account === null && (
        <div className="tacc-actions">
          <button type="button" className="btn btn-soft btn-sm" onClick={() => { setAccount(undefined); void read(); }}>{DI.refresh} {a.retry}</button>
        </div>
      )}
      {activating && (
        <ActivateTransfersModal
          env={env} orgId={orgId}
          onClose={() => setActivating(false)}
          onDone={(next) => { setAccount(next); setActivating(false); showToast(a.modal.started); }}
          onExists={() => { setActivating(false); void read(true); }}
        />
      )}
    </section>
  );
}

/* The receiving account once approved: the holder, and the alias and the CVU to copy. */
function ApprovedAccount({ account }: { account: TransferAccount }) {
  const t = useT();
  const a = t.dash.charges.transfers;
  const rows: [string, string, string][] = [];
  if (account.alias) rows.push(["alias", a.alias, account.alias]);
  if (account.cvu) rows.push(["cvu", a.cvu, account.cvu]);
  return (
    <dl className="tacc-values">
      {account.name && <div className="tacc-value"><dt>{a.holder}</dt><dd>{account.name}</dd></div>}
      {rows.map(([key, label, value]) => <CopyValue key={key} label={label} value={value} shown={key === "cvu" ? groupCvu(value) : value} />)}
    </dl>
  );
}

function CopyValue({ label, value, shown }: { label: string; value: string; shown: string }) {
  const t = useT();
  const a = t.dash.charges.transfers;
  const [done, copy] = useCopy();
  return (
    <div className="tacc-value">
      <dt>{label}</dt>
      <dd>
        <code translate="no">{shown}</code>
        <button
          type="button" className={`copy-mini${done ? " done" : ""}`} onClick={() => copy(value, t.toasts.copied)}
          title={`${a.copy}: ${label}`} aria-label={`${a.copy}: ${label}`}
        >{done ? <IcCheck /> : <IcCopy />}</button>
      </dd>
    </div>
  );
}

/* Activating, in three steps: who holds the account (a person or a company, the name, the CUIT or
   CUIL with its check digit, a person's date of birth), how to reach them, where they are. Then
   who does what: the organization finishes the verification on the provider's form, Cosmos Pay
   turns bank transfers on once it is approved. */
function ActivateTransfersModal({ env, orgId, onClose, onDone, onExists }: {
  env: string;
  orgId: string;
  onClose: () => void;
  onDone: (account: TransferAccount) => void;
  onExists: () => void;
}) {
  const t = useT();
  const a = t.dash.charges.transfers;
  const m = a.modal;
  const [draft, setDraft] = useState<TransferAccountDraft>(emptyTransferAccountDraft);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (key: keyof TransferAccountDraft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const steps = useFormSteps(3);
  const body = transferAccountBody(draft);
  const person = draft.type === "person";

  // Each field's complaint once something is typed in it.
  const taxProblem = draft.taxId.trim() ? taxIdProblem(draft.taxId, draft.type) : null;
  const taxError = taxProblem === "shape" ? m.taxIdShape : taxProblem === "check" ? m.taxIdCheck : taxProblem === "kind" ? (person ? m.taxIdPerson : m.taxIdCompany) : null;
  const birthProblem = person && draft.dateOfBirth.trim() ? birthDateProblem(draft.dateOfBirth) : null;
  const birthError = birthProblem === "age" ? m.birthAge : birthProblem ? m.birthShape : null;
  const emailError = draft.email.trim() && !emailOk(draft.email) ? m.emailBad : null;
  const phoneError = draft.phone.trim() && !phoneOk(draft.phone) ? m.phoneBad : null;
  const postalError = draft.postalCode.trim() && !postalCodeOk(draft.postalCode) ? m.postalBad : null;

  const submit = async () => {
    if (!body || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const parsed = parseTransferAccount(await onramp.post(PATH, env, orgId, body));
      if (!parsed) throw new Error(m.error);
      onDone(parsed);
    } catch (e: any) {
      const code = Number(e?.code ?? e?.status);
      if (code === 409) {
        showToast(m.exists, "error");
        onExists();
        return;
      }
      setProblem(code === 503 ? m.unavailable : code === 400 ? m.refused : m.error);
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const err = (msg: string | null) => msg && <p className="field-err" role="alert">{msg}</p>;

  return (
    <Modal onClose={onClose} label={m.title}>
      <div className="modal-body tacc-form">
        <div className="modal-eyebrow">{a.title}</div>
        <h3>{m.title}</h3>
        <FormSteps names={[m.steps.holder, m.steps.contact, m.steps.address]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (<>
            <div className="fld">
              <span className="field-l" id="tacc-type-l">{m.type}</span>
              <div className="zka-choices" role="radiogroup" aria-labelledby="tacc-type-l">
                {TRANSFER_ACCOUNT_TYPES.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={draft.type === k} className={`zka-choice${draft.type === k ? " on" : ""}`} onClick={() => setDraft((d) => ({ ...d, type: k }))}>
                    <span className="zka-choice-mark" aria-hidden="true">{draft.type === k && <IcCheck />}</span>
                    <span>
                      <b>{m.types[k]}</b>
                      <span className="zka-choice-d">{m.typeDesc[k]}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Field label={person ? m.namePerson : m.nameCompany} value={draft.name} onChange={set("name")} autoComplete={person ? "name" : "organization"} maxLength={120} />
            <Field
              label={person ? m.taxIdPersonLabel : m.taxIdCompanyLabel} hint={m.taxIdHint} value={draft.taxId} onChange={set("taxId")}
              inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={20} aria-invalid={taxError ? true : undefined}
            />
            {err(taxError)}
            {person && (<>
              <Field label={m.birth} type="date" max={today} value={draft.dateOfBirth} onChange={set("dateOfBirth")} autoComplete="bday" aria-invalid={birthError ? true : undefined} />
              {err(birthError)}
            </>)}
          </>)}

          {steps.step === 1 && (<>
            <Field label={m.email} type="email" value={draft.email} onChange={set("email")} autoComplete="email" maxLength={254} aria-invalid={emailError ? true : undefined} />
            {err(emailError)}
            <Field label={m.phone} hint={m.phoneHint} type="tel" value={draft.phone} onChange={set("phone")} autoComplete="tel" maxLength={24} aria-invalid={phoneError ? true : undefined} />
            {err(phoneError)}
          </>)}

          {steps.step === 2 && (<>
            <Field label={m.address} value={draft.address} onChange={set("address")} autoComplete="street-address" maxLength={120} />
            <div className="tacc-row">
              <Field label={m.city} value={draft.city} onChange={set("city")} autoComplete="address-level2" maxLength={80} />
              <Field label={m.postalCode} value={draft.postalCode} onChange={set("postalCode")} autoComplete="postal-code" maxLength={8} aria-invalid={postalError ? true : undefined} />
            </div>
            {err(postalError)}
            {/* What happens once it is sent, each step with who takes it. */}
            <ol className="zka-sigs qrc-flow" aria-label={m.flowLabel}>
              {(["form", "review", "active"] as const).map((k, i) => (
                <li key={k}>
                  <span className="fstep-n" aria-hidden="true">{i + 1}</span>
                  <span className="zka-sig-t">{m.flow[k]}</span>
                  <span className="zka-sig-who">{k === "form" ? m.who.you : m.who.cosmos}</span>
                </li>
              ))}
            </ol>
          </>)}
        </FormStep>
        {problem && <p className="field-err" role="alert">{problem}</p>}
        <FormStepsFooter
          steps={steps} canNext={transferAccountStepOk(draft, steps.step)} onCancel={onClose}
          submitLabel={busy ? m.submitting : m.submit} onSubmit={submit} busy={busy} submitDisabled={!body}
        />
      </div>
    </Modal>
  );
}
