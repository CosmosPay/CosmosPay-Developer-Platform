/* fiat-direct.ts: the browser half of the direct flow on /fiat/{id}, a charge in local money paid by
 * bank transfer to a verified person, inside this page (the charge's `p2pDirect`).
 *
 * The page script (src/scripts/payments/fiat-request.ts) owns the charge and its views; when the
 * payer pays this way its view is "direct" and this module draws the steps inside the
 * `.fq-direct` section of FiatCharge.astro (`data-dstep` lists the steps an element shows in):
 *   email -> code -> [details -> phone] -> [document -> review | rejected] -> account
 *   -> matching -> pay -> confirming -> completed (the page's paid view) | cancelled | disputed.
 * Every answer goes through src/lib/payments/p2p-direct.ts first and lands in the DOM as textContent
 * or as a checked attribute (the ID check's https link, a mailto), never as HTML.
 *
 * What this tab keeps (sessionStorage, per charge): the opaque session the server sealed and the
 * order's id, so a reload resumes; never the email, the phone, the account or the document, which
 * live in their fields (and in memory, the email, for the code's hint) only until sent. A 401 sends
 * the payer back to the email (the order's id stays, so the order resumes after signing in again);
 * the session is forgotten once the charge is paid or closed.
 *
 * Reads: the identity check every 5 s while the ID document step is on screen (10 s in review), an
 * order every 4 s while finding who to transfer to, then every 10 s (pay) or 5 s (confirming); never
 * while the tab is hidden, and once more the moment it is shown.
 */
import { fiatStorageKey, formatMoney, groupCvu, transferAmountToCopy, type FiatRequest } from "@/lib/payments/fiat-request";
import {
  accountProblems,
  bankName,
  countdown,
  directAccounts,
  directCreateOrder,
  directKyc,
  directKycDetails,
  directKycPhone,
  directLogin,
  directOrder,
  directOrderCancel,
  directOrderPaid,
  directPollDelay,
  directStepOf,
  directVerify,
  normalizeAccount,
  normalizeCity,
  normalizeEmail,
  normalizeLoginCode,
  normalizePhone,
  normalizePhoneCode,
  orderFollowed,
  readStoredDirect,
  type AccountField,
  type DirectFailure,
  type DirectKyc,
  type DirectOrder,
  type DirectResult,
  type DirectSavedAccount,
  type DirectStep,
  type StoredDirect,
} from "@/lib/payments/p2p-direct";
import type { Messages } from "@/lib/payments/i18n";

type Fiat = Messages["fiat"];

/** The strings this module swaps in at runtime (FiatCharge.astro passes them). */
export interface DirectStrings {
  direct: Fiat["direct"];
  copy: string;
  copied: string;
  copiedLabel: string;
  endingIn: string;
  documentCheck: string;
  closed: string;
  rateLimited: string;
}

/** The pill the page shows over the direct flow's steps. */
export type DirectPill = "open" | "matching" | "transfer" | "confirming" | "paid" | "transferCancelled" | "disputed";

export interface DirectHost {
  root: HTMLElement;
  apiBase: string;
  id: string;
  lang: string;
  t: DirectStrings;
  /** The charge as last read. */
  request(): FiatRequest | null;
  /** Draw the card again (the view or the status may have changed). */
  changed(): void;
  /** Read the charge again now (it may have closed, or stopped taking this way). */
  reload(): void;
  /** Copy a value and say so, on the button and to assistive tech. */
  copy(button: HTMLButtonElement, value: string, select: HTMLElement | null): void;
}

export interface DirectFlow {
  /** This tab holds something of the flow: a session, a code awaited or an order. */
  resumable(): boolean;
  /** An order the payer started is not over: it is followed whatever the charge's deadline says. */
  following(): boolean;
  /** The order completed: the page shows its paid view. */
  completed(): boolean;
  /** The view is (or stops being) the direct flow: reads start or stop. */
  show(active: boolean): void;
  /** Draw the steps (the page calls it while the view is the direct flow). */
  render(): void;
  /** Move focus to the step's first field or its title, after the payer chose this way. */
  focus(): void;
  pill(): DirectPill;
  body(): string;
  /** The tab came back into view: read now what the step follows. */
  refresh(): void;
  /** The charge is paid or closed: forget the session. */
  finish(): void;
}

type Busy = "email" | "code" | "resend" | "details" | "phone" | "recheck" | "account" | "dialog" | "restart";
type ErrorSlot = "email" | "code" | "details" | "phone" | "account" | "dialog" | "general";
type DialogKind = "paid" | "cancel";

const ERROR_RETRY_MAX_MS = 60_000;
/* Past the deadline to transfer, how often the order is read until it says it was cancelled. */
const PAST_DUE_POLL_MS = 5_000;
/* How often an order is read once the charge answers it closed (its own read takes over). */
const CLOSED_ORDER_POLL_MS = 30_000;
const NEW_ACCOUNT = "new";
/* The form field each account problem points at. */
const ACCOUNT_INPUTS: Record<AccountField, string> = {
  holder: "fq-d-holder",
  cbu: "fq-d-cbu",
  documentType: "fq-d-doctype",
  document: "fq-d-taxid",
  bank: "fq-d-bank",
  accountType: "fq-d-acctype",
};

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

export function createDirectFlow(host: DirectHost): DirectFlow | null {
  const { root, apiBase, id, lang, t } = host;
  const d = t.direct;
  const section = root.querySelector<HTMLElement>(".fq-direct");
  const dialog = root.querySelector<HTMLDialogElement>("dialog.fq-dialog");
  if (!section || !dialog) return null;
  const storageKey = fiatStorageKey("direct", id);

  const slot = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`.fq-direct [data-dslot="${name}"], dialog.fq-dialog [data-dslot="${name}"]`);
  const input = (idAttr: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${idAttr}`);
  const value = (idAttr: string) => input(idAttr)?.value ?? "";
  const text = (name: string, v: string) => {
    const el = slot(name);
    if (el && el.textContent !== v) el.textContent = v;
  };
  const hide = (name: string, hidden: boolean) => {
    const el = slot(name);
    if (el) el.hidden = hidden;
  };

  /* ---- state ---- */

  let stored: StoredDirect = readStored() ?? { session: null, expiresAt: null, orderId: null };
  let challenge: string | null = null;
  /* In memory only, for the code's hint and a new code: never stored or sent anywhere else. */
  let email = "";
  let kyc: DirectKyc | null = null;
  let accounts: DirectSavedAccount[] | null = null;
  let accountsKey = "";
  let chosenAccount: string | null = null;
  let order: DirectOrder | null = null;
  let editingPhone = false;
  let busy: Busy | null = null;
  let syncing = false;
  let errors: Partial<Record<ErrorSlot, string>> = {};
  let invalid: string | null = null;
  let codeNote = "";
  let documentNote = "";
  let notice = "";
  let dialogKind: DialogKind | null = null;
  let active = false;
  let started = false;
  let pollTimer: number | undefined;
  let pollAt = 0;
  let pollStep: DirectStep | null = null;
  /* After a failed read, no read before this (the backoff), whatever the step's cadence says. */
  let notBefore = 0;
  let tickTimer: number | undefined;
  let errorDelay = 5_000;
  let lastStep: DirectStep | null = null;
  let wantFocus = false;

  function readStored(): StoredDirect | null {
    try {
      return readStoredDirect(window.sessionStorage.getItem(storageKey));
    } catch {
      return null;
    }
  }

  function save() {
    try {
      if (stored.session || stored.orderId) window.sessionStorage.setItem(storageKey, JSON.stringify(stored));
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      /* storage blocked: a reload starts over */
    }
  }

  const step = (): DirectStep => directStepOf({ session: !!stored.session, challenge: !!challenge, kyc, order, editingPhone });
  const otherWays = () => (host.request()?.methods.length ?? 0) > 1;

  /* ---- what a failure says ---- */

  function failureText(failure: DirectFailure): string {
    switch (failure) {
      case "unavailable":
      case "method-unavailable":
        return otherWays() ? d.unavailableOther : d.unavailable;
      case "no-sellers":
        return d.noSellers;
      case "too-many-orders":
        return d.tooManyOrders;
      case "invalid-account":
        return d.invalidAccount;
      case "invalid-email":
        return d.emailInvalid;
      case "invalid-phone":
        return d.phoneInvalid;
      case "rejected":
        return d.rejectedInput;
      case "order-moved":
        return d.orderMoved;
      case "closed":
        return t.closed;
      default:
        return d.failed;
    }
  }

  /** The failures every call answers the same way. True when handled (nothing else to say). */
  function common(res: { failure: DirectFailure; retryAfterMs: number | null }, slotName: ErrorSlot): boolean {
    switch (res.failure) {
      case "session-expired":
        expire();
        return true;
      case "closed":
      case "method-unavailable":
        // The charge closed or stopped taking this way: its own read decides what the page shows.
        errors[slotName] = failureText(res.failure);
        host.reload();
        return true;
      case "rate-limited":
        errors[slotName] = t.rateLimited;
        return true;
      default:
        return false;
    }
  }

  /** The session ended (401): back to the email. The order's id stays, so it resumes after. */
  function expire() {
    stored = { session: null, expiresAt: null, orderId: stored.orderId };
    save();
    challenge = null;
    kyc = null;
    accounts = null;
    editingPhone = false;
    errors = {};
    notice = d.sessionExpired;
    if (dialog!.open) dialog!.close();
    dialogKind = null;
    wantFocus = true;
  }

  function setOrder(next: DirectOrder) {
    order = next;
    if (stored.orderId !== next.id) {
      stored = { ...stored, orderId: next.id };
      save();
    }
  }

  /* ---- reading what the step follows ---- */

  function schedule(ms: number | null) {
    window.clearTimeout(pollTimer);
    pollTimer = undefined;
    if (ms === null || !active || document.hidden) return;
    pollAt = Date.now() + ms;
    pollStep = step();
    pollTimer = window.setTimeout(() => {
      pollTimer = undefined;
      void sync();
    }, ms);
  }

  /** The next read, from where the flow stands: what the step polls, or a first read. A read
      already planned for the same step and no later is kept: the page draws far more often than it
      reads (every read of the charge, every keystroke's error), and must not keep postponing it. */
  function plan() {
    const s = step();
    if (!stored.session || busy) return schedule(null);
    const cadence = s === "loading" ? 0 : directPollDelay(s);
    if (cadence === null) return schedule(null);
    const delay = Math.max(cadence, notBefore - Date.now());
    if (pollTimer !== undefined && pollStep === s && pollAt <= Date.now() + delay) return;
    schedule(delay);
  }

  async function sync(): Promise<void> {
    const session = stored.session;
    if (!session || syncing || busy) return;
    syncing = true;
    let retry: number | null = null;
    try {
      if (stored.orderId) {
        const res = await directOrder(apiBase, id, session, stored.orderId);
        if (res.kind === "ok") {
          setOrder(res.value);
          delete errors.general;
          errorDelay = 5_000;
        } else if (res.failure === "not-found") {
          // Not this charge's order (or gone): the account step again.
          order = null;
          stored = { ...stored, orderId: null };
          save();
          retry = 0;
        } else if (res.failure === "closed") {
          // The charge is no longer open (processing once the transfer was confirmed, or closed):
          // the order keeps its last state, the charge's read decides the view, and the order is
          // read again slowly.
          host.reload();
          retry = CLOSED_ORDER_POLL_MS;
        } else {
          retry = readFailed(res);
        }
        return;
      }
      const res = await directKyc(apiBase, id, session);
      if (res.kind !== "ok") {
        retry = readFailed(res);
        return;
      }
      kyc = res.value;
      if (kyc.step !== "phone") editingPhone = false;
      if (kyc.step === "ready" && accounts === null) {
        const list = await directAccounts(apiBase, id, session);
        if (list.kind === "ok") accounts = list.value;
        else retry = readFailed(list);
      }
      if (retry === null) {
        delete errors.general;
        errorDelay = 5_000;
      }
    } finally {
      syncing = false;
      notBefore = retry === null ? 0 : Date.now() + retry;
      changed();
    }
  }

  /** A read that failed: what to say and when to try again (null: not again). */
  function readFailed(res: { kind: "fail"; failure: DirectFailure; retryAfterMs: number | null }): number | null {
    if (res.failure === "session-expired") {
      expire();
      return null;
    }
    if (res.failure === "closed" || res.failure === "method-unavailable") {
      host.reload();
      return null;
    }
    if (res.failure === "rate-limited") return res.retryAfterMs ?? 30_000;
    errors.general = failureText(res.failure);
    const wait = errorDelay;
    errorDelay = Math.min(errorDelay * 2, ERROR_RETRY_MAX_MS);
    return wait;
  }

  /* ---- drawing ---- */

  function changed() {
    host.changed();
  }

  function setBusy(name: Busy | null) {
    busy = name;
    changed();
  }

  function renderButtons() {
    root.querySelectorAll<HTMLButtonElement>(".fq-direct [data-dsubmit], dialog.fq-dialog [data-dsubmit]").forEach((b) => {
      const mine = busy === b.dataset.dsubmit;
      b.disabled = busy !== null;
      b.setAttribute("aria-busy", String(mine));
      const spinner = b.querySelector<HTMLElement>(".fq-busy");
      if (spinner) spinner.hidden = !mine;
      const label = b.querySelector<HTMLElement>("[data-idle]");
      if (label) {
        const next = mine ? label.dataset.busy ?? "" : label.dataset.idle ?? "";
        if (label.textContent !== next) label.textContent = next;
      }
    });
    root.querySelectorAll<HTMLButtonElement>(".fq-direct [data-daction], dialog.fq-dialog [data-daction]").forEach((b) => {
      b.disabled = busy !== null;
    });
    section!.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach((el) => {
      if (el instanceof HTMLInputElement && el.type !== "radio") el.readOnly = busy !== null;
      else el.disabled = busy !== null;
    });
  }

  function renderErrors() {
    root.querySelectorAll<HTMLElement>(".fq-direct [data-derror], dialog.fq-dialog [data-derror]").forEach((el) => {
      const message = errors[el.dataset.derror as ErrorSlot] ?? "";
      if (el.textContent !== message) el.textContent = message;
      el.hidden = !message;
    });
    section!.querySelectorAll<HTMLElement>("input, select").forEach((el) => {
      if (el.id && el.id === invalid) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    });
  }

  /* The saved accounts as choice cards, rebuilt only when the list changes (a render must not
     move focus), then "another account". */
  function renderAccounts() {
    const list = accounts ?? [];
    if (chosenAccount === null || (chosenAccount !== NEW_ACCOUNT && !list.some((a) => a.id === chosenAccount))) {
      chosenAccount = list[0]?.id ?? NEW_ACCOUNT;
    }
    const key = JSON.stringify(list);
    const holder = slot("saved");
    if (holder && key !== accountsKey) {
      accountsKey = key;
      const card = (idValue: string, name: string, desc: string | null) => {
        const label = document.createElement("label");
        label.className = "fq-method";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "fq-d-account";
        radio.className = "fq-radio";
        radio.value = idValue;
        const textBox = document.createElement("span");
        textBox.className = "fq-method-text";
        const title = document.createElement("span");
        title.className = "fq-method-name";
        title.textContent = name;
        textBox.append(title);
        if (desc) {
          const sub = document.createElement("span");
          sub.className = "fq-method-desc";
          sub.textContent = desc;
          textBox.append(sub);
        }
        label.append(radio, textBox);
        return label;
      };
      holder.replaceChildren(
        ...list.map((a) => {
          // The hint is the number's last digits or the alias, as the server gives it.
          const ending = /^\d+$/.test(a.hint) ? fill(t.endingIn, { digits: a.hint }) : a.hint;
          const where = bankName(a.bank);
          return card(a.id, a.holder, where ? `${where} · ${ending}` : ending);
        }),
        card(NEW_ACCOUNT, d.otherAccount, null),
      );
    }
    holder?.querySelectorAll<HTMLInputElement>("input.fq-radio").forEach((radio) => {
      radio.checked = radio.value === chosenAccount;
    });
    hide("saved-fieldset", list.length === 0);
    hide("new-account", chosenAccount !== NEW_ACCOUNT);
  }

  /* The verified person's account, each value a payer copies with its button. */
  function renderPayTo(s: DirectStep) {
    const o = order;
    const p = o?.payTo;
    if (!o || !p) return;
    text("p-amount", formatMoney(o.amount, o.currency, lang));
    text("p-holder", p.holder);
    const cbu = slot("p-cbu");
    if (cbu && cbu.dataset.value !== (p.cbu ?? "")) {
      cbu.dataset.value = p.cbu ?? "";
      cbu.replaceChildren(
        ...(p.cbu ? groupCvu(p.cbu).split(" ") : []).map((group) => {
          const span = document.createElement("span");
          span.textContent = group;
          return span;
        }),
      );
    }
    text("p-alias", p.alias ?? "");
    const bank = bankName(p.bank);
    text("p-bank", bank ?? "");
    section!.querySelectorAll<HTMLElement>("[data-drow]").forEach((row) => {
      const name = row.dataset.drow;
      row.hidden = name === "cbu" ? !p.cbu : name === "alias" ? !p.alias : name === "bank" ? !bank : false;
    });
    section!.querySelectorAll<HTMLButtonElement>("button[data-dcopy]").forEach((b) => {
      b.disabled = s !== "pay" || busy !== null;
    });
  }

  /* The clock to the deadline in `pay`; in `confirming`, the help once its time has come. Runs every
     second without drawing the rest of the card. */
  function tick() {
    const s = step();
    const left = s === "pay" ? countdown(order?.dueAt ?? null) : null;
    const clock = s === "pay" ? (left ? fill(d.timeLeft, { time: left }) : d.timeOver) : "";
    text("countdown", clock);
    hide("countdown", s !== "pay" || !order?.dueAt);
    const late = s === "confirming" && !!order?.dueAt && Date.parse(order.dueAt) <= Date.now();
    hide("help", !late);
    hide("support-row", !(late || s === "cancelled" || s === "disputed" || s === "rejected"));
    // Past the deadline the order cancels itself: read it sooner than the step's cadence.
    if (s === "pay" && !left && order?.dueAt && !syncing && (pollTimer === undefined || pollAt > Date.now() + PAST_DUE_POLL_MS)) {
      schedule(PAST_DUE_POLL_MS);
    }
  }

  function startTicker(on: boolean) {
    if (on && tickTimer === undefined) tickTimer = window.setInterval(tick, 1_000);
    if (!on && tickTimer !== undefined) {
      window.clearInterval(tickTimer);
      tickTimer = undefined;
    }
  }

  function supportHref(): string {
    const base = slot<HTMLAnchorElement>("support")?.dataset.base ?? "";
    // Only references: the charge and the order, nothing the payer typed.
    const ref = order ? `${id} / ${order.id}` : id;
    return base ? `${base}?subject=${encodeURIComponent(ref)}` : "";
  }

  function render() {
    const s = step();
    section!.dataset.step = s;
    section!.querySelectorAll<HTMLElement>("[data-dstep]").forEach((el) => {
      el.hidden = !(el.dataset.dstep ?? "").split(" ").includes(s);
    });
    const title = s === "loading" ? "" : d.title[s as keyof typeof d.title] ?? "";
    text("title", title);
    hide("title", !title);

    text("code-hint", fill(d.codeHint, { email }));
    text("code-note", codeNote);
    hide("code-note", !codeNote);

    const doc = slot<HTMLAnchorElement>("document-link");
    if (doc) {
      if (kyc?.documentUrl) doc.href = kyc.documentUrl;
      else doc.removeAttribute("href");
      doc.hidden = !kyc?.documentUrl;
    }
    hide("document-preparing", !!kyc?.documentUrl);
    text("document-note", documentNote);
    hide("document-note", !documentNote);

    if (s === "account") renderAccounts();
    if (s === "pay" || s === "confirming") renderPayTo(s);

    text("reference", order?.id ?? "");
    const support = slot<HTMLAnchorElement>("support");
    if (support) support.href = supportHref();

    renderButtons();
    renderErrors();
    tick();
    startTicker(active && (s === "pay" || s === "confirming"));

    if (s !== lastStep) {
      const moved = lastStep !== null;
      lastStep = s;
      // A step the payer did not ask for (a read moved it) takes focus only when focus was in the
      // flow already, so a read never pulls the payer away from what they were doing.
      const inFlow = document.activeElement === document.body || section!.contains(document.activeElement);
      if (wantFocus || (moved && inFlow)) focusStep();
      wantFocus = false;
    }
    plan();
  }

  function focusStep() {
    const s = step();
    const form = section!.querySelector<HTMLFormElement>(`form[data-dstep~="${s}"]`);
    // The first field the payer can see: a checked saved account, else the first text field.
    const fields = form ? Array.from(form.querySelectorAll<HTMLInputElement>("input.fq-radio:checked, input:not([type=radio])")) : [];
    const first = fields.find((el) => !el.closest("[hidden]"));
    if (first) {
      first.focus();
      return;
    }
    slot("title")?.focus();
  }

  /* ---- the payer's actions ---- */

  function fail(slotName: ErrorSlot, message: string, field: string | null) {
    errors[slotName] = message;
    invalid = field;
    changed();
    if (field) input(field)?.focus();
  }

  function clearErrors() {
    errors = {};
    invalid = null;
  }

  async function sendEmail() {
    const typed = normalizeEmail(value("fq-d-email"));
    if (!typed) return fail("email", d.emailInvalid, "fq-d-email");
    clearErrors();
    notice = "";
    setBusy("email");
    const res = await directLogin(apiBase, id, typed, lang);
    busy = null;
    if (res.kind === "ok") {
      email = typed;
      challenge = res.value.challenge;
      codeNote = "";
      const field = input("fq-d-code");
      if (field) field.value = "";
      wantFocus = true;
      return changed();
    }
    if (!common(res, "email")) errors.email = failureText(res.failure);
    invalid = res.failure === "invalid-email" ? "fq-d-email" : null;
    changed();
  }

  async function resend() {
    if (!email) return;
    clearErrors();
    setBusy("resend");
    const res = await directLogin(apiBase, id, email, lang);
    busy = null;
    if (res.kind === "ok") {
      challenge = res.value.challenge;
      codeNote = d.resent;
    } else if (!common(res, "code")) {
      errors.code = failureText(res.failure);
    }
    changed();
  }

  async function sendCode() {
    const code = normalizeLoginCode(value("fq-d-code"));
    if (!challenge) return;
    if (!code) return fail("code", d.codeInvalid, "fq-d-code");
    clearErrors();
    codeNote = "";
    setBusy("code");
    const res = await directVerify(apiBase, id, challenge, code);
    busy = null;
    if (res.kind === "ok") {
      stored = { session: res.value.session, expiresAt: res.value.expiresAt, orderId: stored.orderId };
      save();
      challenge = null;
      email = "";
      kyc = null;
      accounts = null;
      const field = input("fq-d-code");
      if (field) field.value = "";
      wantFocus = true;
      changed();
      return void sync();
    }
    if (res.failure === "invalid-code") return fail("code", d.codeWrong, "fq-d-code");
    if (!common(res, "code")) errors.code = failureText(res.failure);
    changed();
  }

  function useAnotherEmail() {
    stored = { session: null, expiresAt: null, orderId: null };
    save();
    challenge = null;
    email = "";
    kyc = null;
    accounts = null;
    order = null;
    editingPhone = false;
    notice = "";
    codeNote = "";
    clearErrors();
    wantFocus = true;
    changed();
  }

  async function sendDetails() {
    const session = stored.session;
    if (!session) return;
    const city = normalizeCity(value("fq-d-city"));
    if (!city) return fail("details", d.cityInvalid, "fq-d-city");
    const phone = normalizePhone(value("fq-d-phone"));
    if (!phone) return fail("details", d.phoneInvalid, "fq-d-phone");
    clearErrors();
    setBusy("details");
    const res = await directKycDetails(apiBase, id, session, { city, phone });
    busy = null;
    if (res.kind === "ok") {
      kyc = res.value;
      editingPhone = false;
      if (kyc.step === "details" && kyc.error) {
        return fail("details", kyc.error === "phone_taken" ? d.phoneTaken : d.phoneInvalid, "fq-d-phone");
      }
      wantFocus = true;
      return changed();
    }
    if (res.failure === "invalid-phone") return fail("details", d.phoneInvalid, "fq-d-phone");
    if (!common(res, "details")) errors.details = failureText(res.failure);
    changed();
  }

  async function sendPhoneCode() {
    const session = stored.session;
    if (!session) return;
    const code = normalizePhoneCode(value("fq-d-sms"));
    if (!code) return fail("phone", d.phoneCodeInvalid, "fq-d-sms");
    clearErrors();
    setBusy("phone");
    const res = await directKycPhone(apiBase, id, session, code);
    busy = null;
    if (res.kind === "ok") {
      kyc = res.value;
      const field = input("fq-d-sms");
      if (field) field.value = "";
      wantFocus = true;
      return changed();
    }
    if (res.failure === "invalid-code") return fail("phone", d.phoneCodeWrong, "fq-d-sms");
    if (!common(res, "phone")) errors.phone = failureText(res.failure);
    changed();
  }

  async function recheck() {
    const session = stored.session;
    if (!session) return;
    setBusy("recheck");
    const res = await directKyc(apiBase, id, session);
    busy = null;
    if (res.kind === "ok") {
      kyc = res.value;
      documentNote = kyc.step === "document" ? d.documentPending : "";
      if (kyc.step !== "document") wantFocus = true;
      if (kyc.step === "ready" && accounts === null) return void sync();
    } else if (!common(res, "general")) {
      errors.general = failureText(res.failure);
    }
    changed();
  }

  function accountMessage(field: AccountField, problem: "empty" | "shape" | "check"): string {
    switch (field) {
      case "holder":
        return d.holderInvalid;
      case "cbu":
        return problem === "check" ? d.cbuCheck : d.cbuShape;
      case "document":
        return problem === "check" ? t.documentCheck : d.taxIdShape;
      case "bank":
        return d.bankRequired;
      default:
        return d.accountRequired;
    }
  }

  async function createOrder() {
    const session = stored.session;
    if (!session) return;
    let from: Parameters<typeof directCreateOrder>[3];
    if (chosenAccount && chosenAccount !== NEW_ACCOUNT) {
      from = { accountId: chosenAccount };
    } else {
      const typed = {
        holder: value("fq-d-holder"),
        cbu: value("fq-d-cbu"),
        documentType: value("fq-d-doctype"),
        document: value("fq-d-taxid"),
        bank: value("fq-d-bank"),
        accountType: value("fq-d-acctype"),
      };
      const first = accountProblems(typed)[0];
      if (first) return fail("account", accountMessage(first.field, first.problem), ACCOUNT_INPUTS[first.field]);
      const account = normalizeAccount(typed);
      if (!account) return fail("account", d.accountRequired, null);
      from = { account };
    }
    clearErrors();
    setBusy("account");
    const res: DirectResult<DirectOrder> = await directCreateOrder(apiBase, id, session, from);
    busy = null;
    if (res.kind === "ok") {
      setOrder(res.value);
      // The typed account was sent once; it is not kept in the form either.
      for (const field of ["fq-d-holder", "fq-d-cbu", "fq-d-taxid"]) {
        const el = input(field);
        if (el) el.value = "";
      }
      accounts = null;
      wantFocus = true;
      return changed();
    }
    if (res.failure === "kyc-required") {
      kyc = null;
      changed();
      return void sync();
    }
    if (!common(res, "account")) errors.account = failureText(res.failure);
    changed();
  }

  function openDialog(kind: DialogKind) {
    dialogKind = kind;
    delete errors.dialog;
    text("dialog-title", kind === "paid" ? d.paidTitle : d.cancelTitle);
    text("dialog-body", kind === "paid" ? d.paidBody : d.cancelBody);
    const yes = slot("dialog-yes");
    if (yes) {
      yes.dataset.idle = kind === "paid" ? d.paidYes : d.cancelYes;
      yes.dataset.busy = kind === "paid" ? d.paidSending : d.cancelling;
      yes.textContent = yes.dataset.idle;
    }
    text("dialog-no", kind === "paid" ? d.paidNo : d.cancelNo);
    dialog!.dataset.kind = kind;
    renderErrors();
    if (!dialog!.open) dialog!.showModal();
  }

  function closeDialog() {
    dialogKind = null;
    if (dialog!.open) dialog!.close();
  }

  async function confirmDialog() {
    const session = stored.session;
    const kind = dialogKind;
    if (!session || !order || !kind) return;
    setBusy("dialog");
    const res = kind === "paid" ? await directOrderPaid(apiBase, id, session, order.id) : await directOrderCancel(apiBase, id, session, order.id);
    busy = null;
    if (res.kind === "ok") {
      setOrder(res.value);
      closeDialog();
      wantFocus = true;
      changed();
      // Saying the transfer is done turns the charge processing: read it now.
      host.reload();
      return;
    }
    if (res.failure === "order-moved") {
      closeDialog();
      errors.general = d.orderMoved;
      changed();
      return void sync();
    }
    if (res.failure === "session-expired" || res.failure === "closed" || res.failure === "method-unavailable") {
      closeDialog();
      common(res, "general");
      return changed();
    }
    errors.dialog = res.failure === "rate-limited" ? t.rateLimited : failureText(res.failure);
    changed();
  }

  async function restart() {
    order = null;
    stored = { ...stored, orderId: null };
    save();
    accounts = null;
    clearErrors();
    wantFocus = true;
    changed();
    await sync();
  }

  /* ---- wiring ---- */

  section.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = (e.target as HTMLElement).closest<HTMLFormElement>("form[data-dform]");
    if (!form || busy) return;
    switch (form.dataset.dform) {
      case "email":
        return void sendEmail();
      case "code":
        return void sendCode();
      case "details":
        return void sendDetails();
      case "phone":
        return void sendPhoneCode();
      case "account":
        return void createOrder();
    }
  });

  // Typing again clears the complaint about what was typed.
  section.addEventListener("input", (e) => {
    const el = e.target as HTMLElement;
    if (el.id && el.id === invalid) {
      invalid = null;
      errors = {};
      renderErrors();
    }
  });

  section.addEventListener("change", (e) => {
    const radio = e.target as HTMLInputElement;
    if (radio.name !== "fq-d-account") return;
    chosenAccount = radio.value;
    delete errors.account;
    changed();
  });

  root.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-daction], button[data-dcopy]");
    if (!target || !root.contains(target)) return;
    if (target.dataset.dcopy) {
      const o = order;
      const kind = target.dataset.dcopy;
      const v = !o?.payTo ? "" : kind === "amount" ? transferAmountToCopy(o.amount) : kind === "cbu" ? (o.payTo.cbu ?? "") : kind === "alias" ? (o.payTo.alias ?? "") : "";
      if (v) host.copy(target as HTMLButtonElement, v, slot(`p-${kind}`));
      return;
    }
    if (busy) return;
    switch (target.dataset.daction) {
      case "resend":
        return void resend();
      case "other-email":
        return useAnotherEmail();
      case "change-phone":
        editingPhone = true;
        clearErrors();
        wantFocus = true;
        return changed();
      case "recheck":
        return void recheck();
      case "paid":
        return openDialog("paid");
      case "cancel":
        return openDialog("cancel");
      case "dialog-yes":
        return void confirmDialog();
      case "dialog-no":
        return closeDialog();
      case "restart":
        return void restart();
    }
  });

  // Escape closes the dialog (the browser's own cancel), unless its call is on its way.
  dialog.addEventListener("cancel", (e) => {
    if (busy === "dialog") e.preventDefault();
    else dialogKind = null;
  });

  /* ---- the page's handle ---- */

  return {
    resumable: () => !!stored.session || !!stored.orderId || !!challenge,
    following: () => orderFollowed(order) || (!!stored.orderId && !order),
    completed: () => order?.status === "completed",
    show(on: boolean) {
      if (on === active) return;
      active = on;
      if (!on) {
        schedule(null);
        startTicker(false);
        if (dialog.open) closeDialog();
        return;
      }
      if (!started) {
        started = true;
        if (stored.session) void sync();
      }
    },
    render,
    focus() {
      wantFocus = false;
      focusStep();
    },
    pill(): DirectPill {
      switch (step()) {
        case "matching":
          return "matching";
        case "pay":
          return "transfer";
        case "confirming":
          return "confirming";
        case "completed":
          return "paid";
        case "cancelled":
          return "transferCancelled";
        case "disputed":
          return "disputed";
        default:
          return "open";
      }
    },
    body(): string {
      const s = step();
      if (s === "email" && notice) return notice;
      return d.body[s as keyof typeof d.body] ?? d.body.loading;
    },
    refresh() {
      if (!active || document.hidden) return;
      const s = step();
      if (s === "loading" || directPollDelay(s) !== null) void sync();
    },
    finish() {
      stored = { session: null, expiresAt: null, orderId: null };
      save();
      challenge = null;
      email = "";
      kyc = null;
      accounts = null;
      schedule(null);
    },
  };
}
