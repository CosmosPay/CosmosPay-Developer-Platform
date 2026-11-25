/* fiat-request.ts: the browser half of /fiat/{id}, a charge in local money.
 *
 * Reads the charge from the gateway, fills FiatCharge.astro's slots and keeps reading it until it
 * is paid (cadence in nextFiatPollDelay: every 5 s while the page is visible, paused while it is
 * hidden, read again the moment it is shown or focused, slowly once expired or cancelled, never
 * again once paid). Every value from the network goes through parseFiatRequest, openFiatSession or
 * startBankTransfer (src/lib/payments/fiat-request.ts) and lands in the DOM as textContent or as
 * an href that was validated first (the secure window's URL, on the marketplace's own hosts only),
 * never as HTML.
 *
 * The charge's `methods` decide how it can be paid. With both, the payer chooses first, bank
 * transfer first; with one, the page goes straight to it.
 *
 * By bank transfer: the payer types their CUIT/CUIL or DNI (checked here, check digit included,
 * and again on the server), the page asks for the deposit instructions and shows them: the exact
 * amount, the alias and the CVU, each with a copy button, the holder when the server names it, and
 * how long they hold. The instructions (never the document, which only stays in the field until
 * sent) are kept in this tab's sessionStorage per charge, so a reload shows them again. The page
 * keeps reading the charge every 5 s: `processing` once the transfer arrived, `paid` once the
 * token was delivered.
 *
 * With another method: the payer picks one and presses Pay. A blank tab is claimed on that click,
 * before the session is requested, so a popup blocker lets it through (the dashboard's ramp widget
 * does the same); the tab then loses its opener and goes to the window's URL. If the browser
 * blocked it anyway, the page shows the window as a link to tap. While the window is open the page
 * waits, offers to reopen the same window or to change the method, and keeps reading the charge
 * until the marketplace's completion marks it paid. The session is kept in this tab's
 * sessionStorage, so a reload goes back to waiting instead of opening a second order.
 *
 * When the charge says `p2pDirect`, that other way runs inside this page instead of the window: a
 * bank transfer to a verified person, after verifying once (src/scripts/payments/fiat-direct.ts
 * draws its steps; the view here is "direct"). An order the payer started there is followed past the
 * charge's deadline and through `processing`, as the window is.
 */
import {
  documentProblem,
  expiresIn,
  fetchFiatRequest,
  fiatMethodName,
  fiatNetworkName,
  fiatPhaseOf,
  formatMoney,
  formatTokenAmount,
  groupCvu,
  nextFiatPollDelay,
  normalizeDocument,
  openFiatSession,
  preselectedMethod,
  readStoredSession,
  readStoredTransfer,
  safeWidgetUrl,
  startBankTransfer,
  transferAmountToCopy,
  transferHasCents,
  transferPhaseOf,
  type BankTransfer,
  type FiatMethod,
  type FiatPhase,
  type FiatRequest,
  type StoredFiatSession,
  fiatStorageKey,
} from "@/lib/payments/fiat-request";
import { currencyName } from "@/lib/ramp-format";
import { createDirectFlow, type DirectFlow, type DirectStrings } from "@/scripts/payments/fiat-direct";

/* What the card shows. The other methods' flow: open, opening, waiting (the window), or direct (the
   transfer to a verified person inside the page). The bank transfer's: document, sending, transfer,
   transfer-expired. Before either: choose. Then the charge's own states: processing, paid, expired,
   cancelled. */
type View = FiatPhase | "opening" | "waiting" | "direct" | "choose" | "document" | "sending" | "transfer" | "transfer-expired";
/* Which way the payer is paying: not chosen yet, or one of the charge's methods. */
type Flow = "choose" | FiatMethod;

type PhaseKey = "open" | "waiting" | "processing" | "transfer" | "paid" | "expired" | "cancelled" | "matching" | "confirming" | "disputed" | "transferCancelled";
type BodyKey = "open" | "waiting" | "paid" | "expired" | "cancelled" | "choose" | "document" | "transfer" | "transferExpired" | "transferLate" | "processing";

interface Runtime extends DirectStrings {
  phase: Record<PhaseKey, string>;
  body: Record<BodyKey, string>;
  receives: string;
  networkFallback: string;
  methodRequired: string;
  noMethods: string;
  pay: string;
  opening: string;
  methodUnavailable: string;
  openFailed: string;
  closed: string;
  errorBody: string;
  rateLimited: string;
  documentEmpty: string;
  documentShape: string;
  documentCheck: string;
  getDetails: string;
  gettingDetails: string;
  invalidDocument: string;
  transferGone: string;
  transferGoneOther: string;
  transferDown: string;
  transferDownOther: string;
  transferFailed: string;
  expiresIn: string;
}

/* A network failure retries on its own, backing off to this ceiling. */
const ERROR_RETRY_MAX_MS = 60_000;
/* Focus and visibility both fire when the payer comes back from the window: one read for both. */
const REFRESH_GAP_MS = 1_000;
/* An amount longer than this many characters ("$ 1.250.000") is set a step smaller (fiat.css). */
const LONG_AMOUNT = 10;
/* How long a copy button says "Copied". */
const COPIED_MS = 2_000;
/* The views where the page is following something the payer started: read at the open cadence. */
const FOLLOWING: readonly View[] = ["waiting", "direct", "transfer", "transfer-expired"];
/* The views before the payer started paying, where the charge's own deadline is shown. */
const BEFORE_PAYING: readonly View[] = ["open", "opening", "choose", "document", "sending"];
const PAYABLE: readonly View[] = [...BEFORE_PAYING, "waiting", "transfer", "transfer-expired"];

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

/** sessionStorage, per charge, that never throws: blocked storage (a private window) only means a
    reload starts over. */
function stored<T>(key: string, read: (raw: string | null) => T | null) {
  return {
    read(): T | null {
      try {
        return read(window.sessionStorage.getItem(key));
      } catch {
        return null;
      }
    },
    write(value: T | null) {
      try {
        if (value) window.sessionStorage.setItem(key, JSON.stringify(value));
        else window.sessionStorage.removeItem(key);
      } catch {
        /* storage blocked: the page still works */
      }
    },
  };
}

export function startFiatRequest(): void {
  const root = document.getElementById("fiat");
  const i18nEl = document.getElementById("fiat-i18n");
  const card = root?.querySelector<HTMLElement>('[data-state="request"]');
  const form = card?.querySelector<HTMLFormElement>("form.fq-pay");
  const list = card?.querySelector<HTMLElement>('[data-slot="methods"]');
  const payButton = card?.querySelector<HTMLButtonElement>('[data-slot="pay-button"]');
  const docForm = card?.querySelector<HTMLFormElement>("form.fq-doc");
  const docInput = card?.querySelector<HTMLInputElement>("#fq-document");
  const docButton = card?.querySelector<HTMLButtonElement>('[data-slot="document-button"]');
  if (!root || !i18nEl || !card || !form || !list || !payButton || !docForm || !docInput || !docButton) return;

  const id = root.dataset.id || "";
  const apiBase = root.dataset.api || "";
  const lang = root.dataset.lang || "en";
  const t = JSON.parse(i18nEl.textContent || "{}") as Runtime;
  const sessionStore = stored<StoredFiatSession>(fiatStorageKey("window", id), (raw) => readStoredSession(raw));
  const transferStore = stored<BankTransfer>(fiatStorageKey("transfer", id), (raw) => readStoredTransfer(raw));

  const slot = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-slot="${name}"]`);
  const text = (name: string, value: string) => {
    const el = slot(name);
    if (el && el.textContent !== value) el.textContent = value;
  };
  const hide = (name: string, hidden: boolean) => {
    const el = slot(name);
    if (el) el.hidden = hidden;
  };
  const row = (name: string, hidden: boolean) => {
    const el = root.querySelector<HTMLElement>(`[data-row="${name}"]`);
    if (el) el.hidden = hidden;
  };

  let request: FiatRequest | null = null;
  let flow: Flow | null = null;
  let chosen: string | null = null;
  let session: StoredFiatSession | null = null;
  let transfer: BankTransfer | null = null;
  let blocked = false;
  let busy = false;
  let sending = false;
  let payError = "";
  let docError = "";
  let methodsKey = "";
  let lastBody = "";
  let timer: number | undefined;
  let nextReadAt = 0;
  let errorDelay = 5_000;
  let lastRead = 0;

  function show(state: "loading" | "not-found" | "error" | "request") {
    root!.querySelectorAll<HTMLElement>(":scope > [data-state]").forEach((el) => {
      el.hidden = el.dataset.state !== state;
    });
  }

  /* Copies one value and says so, on the button and to assistive tech; when the clipboard is
     blocked, the value is selected for the payer to copy by hand. */
  async function copyText(button: HTMLButtonElement, value: string, select: HTMLElement | null) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      if (select) window.getSelection()?.selectAllChildren(select);
      return;
    }
    button.textContent = t.copied;
    button.dataset.copied = "";
    const status = slot("copy-status");
    if (status) {
      // Emptied first, so the same value copied twice is announced twice.
      status.textContent = "";
      window.setTimeout(() => {
        status.textContent = fill(t.copiedLabel, { label: button.dataset.label ?? "" });
      }, 50);
    }
    window.setTimeout(() => {
      button.textContent = t.copy;
      delete button.dataset.copied;
    }, COPIED_MS);
  }

  /* The transfer to a verified person, when the charge pays its other way inside this page. */
  const direct: DirectFlow | null = createDirectFlow({
    root,
    apiBase,
    id,
    lang,
    t,
    request: () => request,
    changed: () => render(),
    reload: () => void load(),
    copy: (button, value, select) => void copyText(button, value, select),
  });

  /* The other way runs inside the page: the charge says so, or an order the payer started there is
     still on its way (the flag may have changed since). */
  const directOn = (r: FiatRequest) => !!direct && (r.p2pDirect || direct.following());

  /* The way in when nothing was chosen: what this tab already started, else the only method, else
     the choice. A charge that lists no method is offered the marketplace's window, as before the
     bank transfer existed (its own read says when no method can pay it). */
  function defaultFlow(r: FiatRequest): Flow {
    if (transfer) return "transfer";
    if (session) return "p2p";
    if (direct?.resumable() && directOn(r)) return "p2p";
    if (r.methods.length > 1) return "choose";
    return r.methods[0] ?? "p2p";
  }

  /* A way the charge stops offering is left, unless the payer already started paying that way:
     money already sent can still arrive. */
  function settleFlow(r: FiatRequest) {
    if (flow === null) flow = defaultFlow(r);
    else if (flow === "transfer" && !transfer && !r.methods.includes("transfer")) flow = defaultFlow(r);
    else if (flow === "p2p" && !session && !direct?.following() && r.methods.length > 0 && !r.methods.includes("p2p")) flow = defaultFlow(r);
    else if (flow === "choose" && r.methods.length < 2) flow = defaultFlow(r);
  }

  function viewOf(r: FiatRequest): View {
    const phase = fiatPhaseOf(r);
    if (phase === "paid" || phase === "cancelled") return phase;
    if (flow === "p2p" && direct && directOn(r)) {
      // The order completed: the seller has the payment, whatever the charge's read says yet.
      if (direct.completed()) return "paid";
      // An order on its way is followed past the deadline and through processing (its own steps
      // say where it stands); before one, the charge's state decides.
      if (direct.following()) return "direct";
      if (phase === "processing" || phase === "expired") return phase;
      return "direct";
    }
    if (phase === "processing") return phase;
    if (flow === "transfer") {
      // Instructions already handed out stay on screen past their deadline: a deposit made then is
      // still detected, and the charge turns processing.
      if (transfer) return phase === "expired" || transferPhaseOf(transfer) === "expired" ? "transfer-expired" : "transfer";
      if (phase === "expired") return "expired";
      return sending ? "sending" : "document";
    }
    // A payer who opened the window waits on it, even past the deadline: the order it started can
    // still complete, and the server then marks the charge paid.
    if (session) return "waiting";
    if (phase === "expired") return "expired";
    if (flow === "choose") return "choose";
    return busy ? "opening" : "open";
  }

  function pillOf(view: View, phase: FiatPhase): PhaseKey {
    if (view === "direct") return direct?.pill() ?? "open";
    if (view === "transfer") return "transfer";
    if (view === "transfer-expired") return phase === "expired" ? "expired" : "open";
    if (view === "opening" || view === "choose" || view === "document" || view === "sending") return "open";
    return view;
  }

  function bodyOf(view: Exclude<View, "direct">, phase: FiatPhase): BodyKey {
    if (view === "opening") return "open";
    if (view === "sending") return "document";
    if (view === "transfer-expired") return phase === "expired" ? "transferLate" : "transferExpired";
    return view;
  }

  function schedule(ms: number) {
    window.clearTimeout(timer);
    nextReadAt = Date.now() + ms;
    timer = window.setTimeout(load, ms);
  }

  async function load() {
    window.clearTimeout(timer);
    timer = undefined;
    // A hidden tab does not need a live status; it reads again the moment it is shown.
    if (document.hidden && request) return;
    lastRead = Date.now();
    const result = await fetchFiatRequest(apiBase, id);
    switch (result.kind) {
      case "ok":
        errorDelay = 5_000;
        request = result.request;
        render();
        return;
      case "not-found":
        request = null;
        show("not-found");
        return;
      case "rate-limited":
        if (!request) {
          text("error-body", t.rateLimited);
          show("error");
        }
        schedule(result.retryAfterMs);
        return;
      default:
        // Keep showing the last good state if there is one; the next read may succeed.
        if (!request) {
          text("error-body", t.errorBody);
          show("error");
        }
        schedule(errorDelay);
        errorDelay = Math.min(errorDelay * 2, ERROR_RETRY_MAX_MS);
    }
  }

  /* The radio list, rebuilt only when the market's methods change (a poll must not move focus). */
  function renderMethods(r: FiatRequest) {
    const key = JSON.stringify(r.paymentMethods);
    chosen = preselectedMethod(r.paymentMethods, chosen);
    if (key !== methodsKey) {
      methodsKey = key;
      list!.replaceChildren(
        ...r.paymentMethods.map((m) => {
          const label = document.createElement("label");
          label.className = "fq-method";
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "fq-method";
          input.className = "fq-radio";
          input.value = m.id;
          const name = document.createElement("span");
          name.className = "fq-method-name";
          name.textContent = fiatMethodName(m, r.currency);
          label.append(input, name);
          return label;
        }),
      );
    }
    list!.querySelectorAll<HTMLInputElement>("input.fq-radio").forEach((input) => {
      input.checked = input.value === chosen;
      input.disabled = busy;
    });
  }

  /* The deposit instructions: the values, each with its copy button, and how long they hold. */
  function renderTransfer(view: View, phase: FiatPhase) {
    const tr = transfer;
    const shown = !!tr && (view === "transfer" || view === "transfer-expired");
    if (tr && shown) {
      // The transfer's own amount, cents included: it can differ from the charge's by a few cents.
      text("t-amount", formatMoney(tr.amount, tr.currency, lang));
      hide("t-cents", !transferHasCents(tr.amount));
      text("t-alias", tr.alias);
      // The CVU in groups of four to read it; the groups are spans, so a selection copies digits only.
      const cvu = slot("t-cvu");
      if (cvu && cvu.dataset.value !== tr.cvu) {
        cvu.dataset.value = tr.cvu;
        cvu.replaceChildren(
          ...groupCvu(tr.cvu).split(" ").map((group) => {
            const span = document.createElement("span");
            span.textContent = group;
            return span;
          }),
        );
      }
      text("t-holder", tr.holder ?? "");
      row("t-holder", !tr.holder);
      text("t-bank", tr.bank ?? "");
      row("t-bank", !tr.bank);
      const when = view === "transfer" ? expiresIn(tr.expiresAt, lang) : null;
      text("t-expiry", when ? fill(t.expiresIn, { time: when }) : "");
      hide("t-expiry", !when);
    }
    root!.querySelectorAll<HTMLButtonElement>(".fq-transfer button[data-copy]").forEach((b) => {
      b.disabled = view !== "transfer";
    });
    root!.querySelector<HTMLElement>(".fq-transfer")?.toggleAttribute("data-expired", view === "transfer-expired");
    // New instructions only while the charge can still be paid.
    hide("new-transfer", !(view === "transfer-expired" && phase === "open"));
    text("document-hint", tr?.documentHint ? fill(t.endingIn, { digits: tr.documentHint }) : "");
    row("document", !(shown && tr?.documentHint));
  }

  /* The document step: its error and its button. */
  function renderDocument() {
    text("document-error", docError);
    hide("document-error", !docError);
    if (docError) docInput!.setAttribute("aria-invalid", "true");
    else docInput!.removeAttribute("aria-invalid");
    docInput!.readOnly = sending;
    docButton!.disabled = sending;
    docButton!.setAttribute("aria-busy", String(sending));
    hide("document-busy", !sending);
    text("document-label", sending ? t.gettingDetails : t.getDetails);
  }

  function render() {
    const r = request;
    if (!r) return;
    show("request");
    settleFlow(r);
    const view = viewOf(r);
    const phase = fiatPhaseOf(r);
    root!.dataset.view = view;

    hide("testnet", r.network !== "testnet");
    const money = formatMoney(r.amount, r.currency, lang);
    text("amount", money);
    slot("amount")?.toggleAttribute("data-long", money.length > LONG_AMOUNT);
    text("currency", currencyName(r.currency, lang, r.currency));
    text("description", r.description ?? "");
    hide("description", !r.description);

    const pillKey = pillOf(view, phase);
    const pill = slot("phase");
    if (pill) {
      pill.textContent = t.phase[pillKey];
      pill.dataset.phase = pillKey;
    }
    // Re-announce only on a change, or a screen reader repeats it every poll.
    const body = view === "direct" ? (direct?.body() ?? "") : t.body[bodyOf(view, phase)];
    if (body !== lastBody) {
      text("phase-body", body);
      lastBody = body;
    }

    const payable = PAYABLE.includes(view);
    const network = fiatNetworkName(r.chainId) ?? fill(t.networkFallback, { id: String(r.chainId) });
    text(
      "receives",
      r.estimatedAmountOut ? fill(t.receives, { amount: formatTokenAmount(r.estimatedAmountOut, lang), token: r.token, network }) : "",
    );
    // Where the other way is a transfer to a verified person, the payer is paying a seller by bank
    // transfer: no token or estimate on the page (product owner, 2026-11-13).
    hide("receives", !payable || !r.estimatedAmountOut || directOn(r));

    // The other way's card says what it is: the secure window, or the transfer to a verified person.
    root!.querySelectorAll<HTMLElement>("[data-p2p]").forEach((el) => {
      el.hidden = el.dataset.p2p !== (directOn(r) ? "direct" : "window");
    });
    direct?.show(view === "direct");

    root!.querySelectorAll<HTMLElement>("[data-when]").forEach((el) => {
      el.hidden = !(el.dataset.when ?? "").split(" ").includes(view);
    });
    // "Choose another way to pay" only where there is another way.
    root!.querySelectorAll<HTMLElement>(".fq-back").forEach((el) => {
      el.hidden = r.methods.length < 2;
    });
    // Once its section shows, so a step that takes focus can.
    if (view === "direct") direct?.render();

    // Paying with another method: the methods, the button and what a click will do.
    renderMethods(r);
    const noMethods = r.paymentMethods.length === 0;
    const message = noMethods ? t.noMethods : payError;
    text("pay-error", message);
    hide("pay-error", !message);
    payButton!.disabled = busy || noMethods;
    payButton!.setAttribute("aria-busy", String(busy));
    hide("pay-busy", !busy);
    text("pay-label", busy ? t.opening : fill(t.pay, { amount: money }));

    // Waiting: the same window again, or the window itself when the browser blocked it.
    const widget = session ? safeWidgetUrl(session.widgetUrl) : null;
    for (const name of ["widget-open", "widget-reopen"]) {
      const a = slot<HTMLAnchorElement>(name);
      if (!a) continue;
      if (widget) a.href = widget;
      else a.removeAttribute("href");
    }
    hide("blocked", !blocked);
    hide("widget-open", !blocked || !widget);
    hide("widget-reopen", blocked || !widget);

    const method = session ? r.paymentMethods.find((m) => m.id === session!.method) : null;
    text("method-name", method ? fiatMethodName(method, r.currency) : "");
    row("method", view !== "waiting" || !method);

    // Paying by bank transfer.
    renderDocument();
    renderTransfer(view, phase);

    const expires = new Date(r.expiresAt);
    // Before an order exists, the direct flow is still before paying: the charge's deadline holds.
    const beforePaying = BEFORE_PAYING.includes(view) || (view === "direct" && !direct?.following());
    row("expires", !beforePaying);
    const expiresEl = slot<HTMLTimeElement>("expires");
    if (expiresEl) {
      expiresEl.dateTime = expires.toISOString();
      expiresEl.textContent = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(expires);
    }
    const paidAt = r.paidAt ? new Date(r.paidAt) : null;
    row("paid", !(view === "paid" && paidAt));
    const paidEl = slot<HTMLTimeElement>("paid-at");
    if (paidEl && paidAt) {
      paidEl.dateTime = paidAt.toISOString();
      paidEl.textContent = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(paidAt);
    }

    // Paid is final: nothing this tab started needs to come back after a reload.
    if (phase === "paid" && (session || transfer)) {
      session = null;
      transfer = null;
      sessionStore.write(null);
      transferStore.write(null);
    }
    // The direct flow's session goes once the charge is paid or closed, unless an order is still
    // on its way (its money may still arrive).
    if (direct && (view === "paid" || ((phase === "expired" || phase === "cancelled") && !direct.following())) && direct.resumable()) {
      direct.finish();
    }

    const delay = nextFiatPollDelay(phase, FOLLOWING.includes(view));
    if (delay !== null && !busy && !sending) {
      // An open charge turns expired at its deadline, without waiting for a read.
      const untilExpiry = beforePaying ? expires.getTime() - Date.now() : Infinity;
      const ms = Math.max(250, Math.min(delay, untilExpiry));
      // A read already planned sooner is kept: the direct flow draws the card between reads, and a
      // draw must not keep postponing the next read.
      if (timer === undefined || Date.now() + ms < nextReadAt) schedule(ms);
    } else if (delay === null) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  }

  function focusFirstMethod() {
    const input = list!.querySelector<HTMLInputElement>("input.fq-radio:checked") ?? list!.querySelector<HTMLInputElement>("input.fq-radio");
    input?.focus();
  }

  async function pay() {
    if (!request || busy || viewOf(request) !== "open") return;
    if (!chosen || !request.paymentMethods.some((m) => m.id === chosen)) {
      payError = t.methodRequired;
      render();
      focusFirstMethod();
      return;
    }
    const method = chosen;
    // Claimed on the click, before the round trip, so a popup blocker sees the payer's gesture.
    const tab = window.open("", "_blank");
    busy = true;
    payError = "";
    render();
    const result = await openFiatSession(apiBase, id, method);
    busy = false;
    if (result.kind === "ok") {
      let opened = false;
      if (tab) {
        try {
          tab.opener = null;
          tab.location.replace(result.widgetUrl);
          opened = true;
        } catch {
          tab.close();
        }
      }
      session = { widgetUrl: result.widgetUrl, reference: result.reference, method, openedAt: Date.now() };
      blocked = !opened;
      sessionStore.write(session);
      render();
      slot<HTMLAnchorElement>(blocked ? "widget-open" : "widget-reopen")?.focus();
      return;
    }
    tab?.close();
    switch (result.kind) {
      case "closed":
        payError = t.closed;
        break;
      case "method":
        payError = t.methodUnavailable;
        chosen = null;
        break;
      case "rate-limited":
        payError = t.rateLimited;
        break;
      default:
        payError = t.openFailed;
    }
    render();
    // A closed charge or a method the market dropped: read it again to show what changed.
    if (result.kind === "closed" || result.kind === "method") void load();
  }

  /* The document typed, checked here first (an 11-digit CUIT/CUIL's check digit too), then the
     instructions asked for. The document is sent once and cleared from the field; only the
     instructions, which carry its last digits at most, are kept. */
  async function requestTransfer() {
    if (!request || sending || viewOf(request) !== "document") return;
    const problem = documentProblem(docInput!.value);
    const typed = normalizeDocument(docInput!.value);
    if (problem || !typed) {
      docError = problem === "check" ? t.documentCheck : problem === "shape" ? t.documentShape : t.documentEmpty;
      render();
      docInput!.focus();
      return;
    }
    sending = true;
    docError = "";
    render();
    const result = await startBankTransfer(apiBase, id, typed);
    sending = false;
    const other = request.methods.includes("p2p");
    switch (result.kind) {
      case "ok":
        transfer = result.transfer;
        transferStore.write(transfer);
        docInput!.value = "";
        render();
        root!.querySelector<HTMLElement>("#fq-transfer-title")?.focus();
        return;
      case "invalid-document":
        docError = t.invalidDocument;
        break;
      case "method-unavailable":
        // The charge no longer takes bank transfers: straight to the other methods when it has them.
        if (other) {
          flow = "p2p";
          payError = t.transferGoneOther;
        } else {
          docError = t.transferGone;
        }
        break;
      case "unavailable":
        docError = other ? t.transferDownOther : t.transferDown;
        break;
      case "closed":
        docError = t.closed;
        break;
      case "rate-limited":
        docError = t.rateLimited;
        break;
      default:
        docError = t.transferFailed;
    }
    render();
    if (flow === "p2p") focusFirstMethod();
    else docInput!.focus();
    if (result.kind === "closed" || result.kind === "method-unavailable") void load();
  }

  /* Copies one value of the instructions and says so, on the button and to assistive tech. */
  async function copyValue(button: HTMLButtonElement) {
    const tr = transfer;
    const kind = button.dataset.copy;
    if (!tr || !kind) return;
    const value = kind === "amount" ? transferAmountToCopy(tr.amount) : kind === "alias" ? tr.alias : kind === "cvu" ? tr.cvu : "";
    if (!value) return;
    await copyText(button, value, slot(`t-${kind}`));
  }

  function choose(next: Flow) {
    flow = next;
    payError = "";
    docError = "";
    render();
    if (next === "transfer") {
      if (transfer) root!.querySelector<HTMLElement>("#fq-transfer-title")?.focus();
      else docInput!.focus();
    } else if (next === "p2p") {
      if (request && viewOf(request) === "direct") direct?.focus();
      else focusFirstMethod();
    } else {
      root!.querySelector<HTMLButtonElement>(".fq-option")?.focus();
    }
  }

  function changeMethod() {
    session = null;
    blocked = false;
    payError = "";
    sessionStore.write(null);
    render();
    focusFirstMethod();
  }

  function newTransfer() {
    transfer = null;
    transferStore.write(null);
    choose("transfer");
  }

  function refresh() {
    if (!document.hidden) direct?.refresh();
    if (document.hidden || Date.now() - lastRead < REFRESH_GAP_MS) return;
    if (request && nextFiatPollDelay(fiatPhaseOf(request), FOLLOWING.includes(viewOf(request))) === null) return;
    void load();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void pay();
  });

  docForm.addEventListener("submit", (e) => {
    e.preventDefault();
    void requestTransfer();
  });

  // A corrected document clears the last complaint about it.
  docInput.addEventListener("input", () => {
    if (!docError) return;
    docError = "";
    renderDocument();
  });

  list.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name !== "fq-method") return;
    chosen = input.value;
    payError = "";
    render();
  });

  root.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action], button[data-copy]");
    if (!target) return;
    if (target.dataset.copy) {
      void copyValue(target as HTMLButtonElement);
      return;
    }
    switch (target.dataset.action) {
      case "change":
        changeMethod();
        break;
      case "choose-transfer":
        choose("transfer");
        break;
      case "choose-p2p":
        choose("p2p");
        break;
      case "back":
        choose("choose");
        break;
      case "new-transfer":
        newTransfer();
        break;
      case "retry":
        errorDelay = 5_000;
        show("loading");
        void load();
        break;
    }
  });

  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", refresh);

  session = sessionStore.read();
  if (session) chosen = session.method;
  transfer = transferStore.read();
  void load();
}
