/* fiat-request.ts: the browser half of /fiat/{id}, a charge in local money.
 *
 * Reads the charge from the gateway, fills FiatCharge.astro's slots and keeps reading it until it
 * is paid (cadence in nextFiatPollDelay: every 5 s while the page is visible, paused while it is
 * hidden, read again the moment it is shown or focused, slowly once expired or cancelled, never
 * again once paid). Every value from the network goes through parseFiatRequest / openFiatSession
 * (src/lib/payments/fiat-request.ts) and lands in the DOM as textContent or as an href that was
 * validated first (the secure window's URL, on the marketplace's own hosts only), never as HTML.
 *
 * Paying: the payer picks a method and presses Pay. A blank tab is claimed on that click, before
 * the session is requested, so a popup blocker lets it through (the dashboard's ramp widget does
 * the same); the tab then loses its opener and goes to the window's URL. If the browser blocked it
 * anyway, the page shows the window as a link to tap. While the window is open the page waits,
 * offers to reopen the same window or to change the method, and keeps reading the charge until the
 * marketplace's completion marks it paid. The session is kept in this tab's sessionStorage, so a
 * reload goes back to waiting instead of opening a second order.
 */
import {
  WAITING_POLL_MS,
  fetchFiatRequest,
  fiatMethodName,
  fiatNetworkName,
  fiatPhaseOf,
  formatMoney,
  formatTokenAmount,
  nextFiatPollDelay,
  openFiatSession,
  preselectedMethod,
  readStoredSession,
  safeWidgetUrl,
  type FiatPhase,
  type FiatRequest,
  type StoredFiatSession,
} from "@/lib/payments/fiat-request";
import { currencyName } from "@/lib/ramp-format";

type View = FiatPhase | "opening" | "waiting";

interface Runtime {
  phase: Record<"open" | "waiting" | "paid" | "expired" | "cancelled", string>;
  body: Record<"open" | "waiting" | "paid" | "expired" | "cancelled", string>;
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
}

/* A network failure retries on its own, backing off to this ceiling. */
const ERROR_RETRY_MAX_MS = 60_000;
/* Focus and visibility both fire when the payer comes back from the window: one read for both. */
const REFRESH_GAP_MS = 1_000;
const STORAGE_PREFIX = "cosmospay-fiat:";
/* An amount longer than this many characters ("$ 1.250.000") is set a step smaller (fiat.css). */
const LONG_AMOUNT = 10;

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

export function startFiatRequest(): void {
  const root = document.getElementById("fiat");
  const i18nEl = document.getElementById("fiat-i18n");
  const card = root?.querySelector<HTMLElement>('[data-state="request"]');
  const form = card?.querySelector<HTMLFormElement>("form.fq-pay");
  const list = card?.querySelector<HTMLElement>('[data-slot="methods"]');
  const payButton = card?.querySelector<HTMLButtonElement>('[data-slot="pay-button"]');
  if (!root || !i18nEl || !card || !form || !list || !payButton) return;

  const id = root.dataset.id || "";
  const apiBase = root.dataset.api || "";
  const lang = root.dataset.lang || "en";
  const t = JSON.parse(i18nEl.textContent || "{}") as Runtime;
  const storageKey = `${STORAGE_PREFIX}${id}`;

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
  let chosen: string | null = null;
  let session: StoredFiatSession | null = null;
  let blocked = false;
  let busy = false;
  let payError = "";
  let methodsKey = "";
  let lastBody = "";
  let timer: number | undefined;
  let errorDelay = 5_000;
  let lastRead = 0;

  /* ---- this tab's session, so a reload keeps waiting on the window it opened ---- */
  const storage = {
    read(): StoredFiatSession | null {
      try {
        return readStoredSession(window.sessionStorage.getItem(storageKey));
      } catch {
        return null;
      }
    },
    write(s: StoredFiatSession | null) {
      try {
        if (s) window.sessionStorage.setItem(storageKey, JSON.stringify(s));
        else window.sessionStorage.removeItem(storageKey);
      } catch {
        /* storage blocked (a private window): the page still works, a reload just starts over */
      }
    },
  };

  function show(state: "loading" | "not-found" | "error" | "request") {
    root!.querySelectorAll<HTMLElement>(":scope > [data-state]").forEach((el) => {
      el.hidden = el.dataset.state !== state;
    });
  }

  function viewOf(r: FiatRequest): View {
    const phase = fiatPhaseOf(r);
    if (phase === "paid" || phase === "cancelled") return phase;
    // A payer who opened the window waits on it, even past the deadline: the order it started can
    // still complete, and the server then marks the charge paid.
    if (session) return "waiting";
    if (phase === "expired") return "expired";
    return busy ? "opening" : "open";
  }

  function schedule(ms: number) {
    window.clearTimeout(timer);
    timer = window.setTimeout(load, ms);
  }

  async function load() {
    window.clearTimeout(timer);
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

  function render() {
    const r = request;
    if (!r) return;
    show("request");
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

    const label = view === "opening" ? "open" : view;
    const pill = slot("phase");
    if (pill) {
      pill.textContent = t.phase[label];
      pill.dataset.phase = label;
    }
    // Re-announce only on a change, or a screen reader repeats it every poll.
    if (t.body[label] !== lastBody) {
      text("phase-body", t.body[label]);
      lastBody = t.body[label];
    }

    const payable = view === "open" || view === "opening" || view === "waiting";
    const network = fiatNetworkName(r.chainId) ?? fill(t.networkFallback, { id: String(r.chainId) });
    text(
      "receives",
      r.estimatedAmountOut ? fill(t.receives, { amount: formatTokenAmount(r.estimatedAmountOut, lang), token: r.token, network }) : "",
    );
    hide("receives", !payable || !r.estimatedAmountOut);

    root!.querySelectorAll<HTMLElement>("[data-when]").forEach((el) => {
      el.hidden = !(el.dataset.when ?? "").split(" ").includes(view);
    });

    // Paying: the methods, the button and what a click will do.
    renderMethods(r);
    const noMethods = r.paymentMethods.length === 0;
    const message = noMethods ? t.noMethods : payError;
    text("pay-error", message);
    hide("pay-error", !message);
    payButton!.disabled = busy || noMethods;
    payButton!.setAttribute("aria-busy", String(busy));
    root!.querySelector<HTMLElement>(".fq-busy")!.hidden = !busy;
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

    const expires = new Date(r.expiresAt);
    row("expires", !(view === "open" || view === "opening"));
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

    if (phase === "paid" && session) {
      session = null;
      storage.write(null);
    }

    const delay = nextFiatPollDelay(phase, view === "waiting");
    if (delay !== null && !busy) {
      // An open charge turns expired at its deadline, without waiting for a read.
      const untilExpiry = view === "open" ? expires.getTime() - Date.now() : Infinity;
      schedule(Math.max(250, Math.min(delay, untilExpiry)));
    } else if (delay === null) {
      window.clearTimeout(timer);
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
      storage.write(session);
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

  function changeMethod() {
    session = null;
    blocked = false;
    payError = "";
    storage.write(null);
    render();
    focusFirstMethod();
  }

  function refresh() {
    if (document.hidden || Date.now() - lastRead < REFRESH_GAP_MS) return;
    if (request && nextFiatPollDelay(fiatPhaseOf(request), viewOf(request) === "waiting") === null) return;
    void load();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void pay();
  });

  list.addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name !== "fq-method") return;
    chosen = input.value;
    payError = "";
    render();
  });

  root.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (target?.dataset.action === "change") changeMethod();
    else if (target?.dataset.action === "retry") {
      errorDelay = 5_000;
      show("loading");
      void load();
    }
  });

  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", refresh);

  session = storage.read();
  if (session) chosen = session.method;
  void load();
}
