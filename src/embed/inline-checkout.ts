/* inline-checkout.ts — <cosmos-pay-checkout link="LINK_ID">: a compact checkout drawn inline
   in the merchant's page, in its own shadow root (no iframe: the payments pages refuse every
   frame, on purpose).

   It reads the link exactly as the hosted checkout does (src/scripts/payments/checkout.ts):
   from the payer's browser, keyless, `GET {PAYMENTS_API_URL}/v1/payment-links/{id}` through
   fetchPaymentLink, so every body passes parsePaymentLink — the trust boundary — before
   anything is drawn. Then it keeps reading it on the same schedule (nextPollDelay), stops on
   the final states, and fires `cosmospay:status` / `cosmospay:paid` on every status change.

   DOM writes are textContent, or attributes parsePaymentLink validated (the QR's PNG data
   URL, the URI whose scheme matches the chain). Never HTML.

   Attributes: `link` (required), `lang` (en/es/pt/fr/de; default from the browser, then
   English), `theme` (light/dark/auto; default light). */
import {
  amountLabel,
  assetSymbol,
  chainName,
  fetchPaymentLink,
  nextPollDelay,
  phaseOf,
  shortAddress,
  type LinkStatus,
  type PaymentLink,
  type Phase,
} from "@/lib/payments/payment-link";
import { PAYMENTS_API_URL } from "@/embed/config";
import { browserLanguages, el } from "@/embed/dom";
import { emitStatus } from "@/embed/events";
import { EMBED_MESSAGES, type EmbedLocale, type EmbedMessages } from "@/embed/i18n";
import { parseLinkId, parseTheme, resolveLang } from "@/embed/options";
import { adoptStyles, CHECKOUT_CSS } from "@/embed/styles";

type State = "loading" | "not-found" | "error" | "link";
const STATES: State[] = ["loading", "not-found", "error", "link"];

/* A failed read retries on its own, backing off from the first delay to the ceiling (the
   hosted checkout's numbers). */
const FIRST_ERROR_DELAY_MS = 5_000;
const ERROR_RETRY_MAX_MS = 60_000;
/* Never read again sooner than this, whatever the deadline arithmetic says. */
const MIN_DELAY_MS = 250;

interface Row {
  row: HTMLDivElement;
  label: HTMLElement;
  value: HTMLElement;
}

export class CosmosPayCheckout extends HTMLElement {
  static observedAttributes = ["link", "lang", "theme"];

  private readonly card: HTMLElement;
  private readonly states = {} as Record<State, HTMLElement>;
  private readonly ui: {
    eyebrow: HTMLElement;
    loadingText: HTMLElement;
    notFoundTitle: HTMLElement;
    notFoundBody: HTMLElement;
    errorTitle: HTMLElement;
    errorBody: HTMLElement;
    retry: HTMLButtonElement;
    testnet: HTMLElement;
    amount: HTMLElement;
    hint: HTMLElement;
    msg: HTMLElement;
    status: HTMLElement;
    statusBody: HTMLElement;
    pay: HTMLElement;
    qr: HTMLImageElement;
    wallet: HTMLAnchorElement;
    network: Row;
    asset: Row;
    expires: Row;
    expiresTime: HTMLTimeElement;
    by: HTMLElement;
  };

  private locale: EmbedLocale = "en";
  private t: EmbedMessages = EMBED_MESSAGES.en;
  private linkId: string | null = null;
  private link: PaymentLink | null = null;
  private timer: number | undefined;
  private errorDelay = FIRST_ERROR_DELAY_MS;
  private errorKind: "error" | "rate-limited" = "error";
  /* Bumped whenever the element restarts or leaves the page: a read that resolves after
     that belongs to a link this element no longer shows, and is dropped. */
  private generation = 0;
  private shownPhase: Phase | null = null;
  private emittedStatus: LinkStatus | null = null;
  private warnedFor: string | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    adoptStyles(shadow, CHECKOUT_CSS);

    const card = el("section", "cp");
    card.setAttribute("part", "card");
    card.setAttribute("aria-labelledby", "cp-title");
    const eyebrow = el("p", "eyebrow", card);
    eyebrow.id = "cp-title";

    // Loading
    const loading = el("div", "state", card);
    const loadingLine = el("p", "loading", loading);
    loadingLine.setAttribute("role", "status");
    el("span", "spinner", loadingLine).setAttribute("aria-hidden", "true");
    const loadingText = el("span", "", loadingLine);

    // Not found (also: no valid `link` attribute)
    const notFound = el("div", "state", card);
    const notFoundTitle = el("p", "state-title", notFound);
    const notFoundBody = el("p", "state-body", notFound);

    // Network trouble, rate limit
    const error = el("div", "state", card);
    const errorTitle = el("p", "state-title", error);
    const errorBody = el("p", "state-body", error);
    errorBody.setAttribute("role", "status");
    const retry = el("button", "btn btn-quiet", error);
    retry.type = "button";

    // The link
    const view = el("div", "", card);
    const testnet = el("p", "testnet", view);
    const amount = el("p", "amount", view);
    const hint = el("p", "hint", view);
    const msg = el("p", "msg", view);
    // Announced when the phase changes, and only then (render writes it on a change).
    const live = el("div", "", view);
    live.setAttribute("role", "status");
    const status = el("p", "status", live);
    const statusBody = el("p", "status-body", live);
    const pay = el("div", "pay", view);
    const qr = el("img", "qr", pay);
    qr.width = 200;
    qr.height = 200;
    qr.decoding = "async";
    const wallet = el("a", "btn", pay);
    const facts = el("dl", "facts", view);
    const row = (): Row => {
      const r = el("div", "row", facts);
      return { row: r, label: el("dt", "", r), value: el("dd", "", r) };
    };
    const network = row();
    const asset = row();
    const expires = row();
    const expiresTime = el("time", "", expires.value);

    const by = el("p", "by", card);

    this.states.loading = loading;
    this.states["not-found"] = notFound;
    this.states.error = error;
    this.states.link = view;
    this.card = card;
    this.ui = {
      eyebrow, loadingText, notFoundTitle, notFoundBody, errorTitle, errorBody, retry, testnet,
      amount, hint, msg, status, statusBody, pay, qr, wallet, network, asset, expires, expiresTime, by,
    };
    shadow.append(card);

    retry.addEventListener("click", () => {
      this.errorDelay = FIRST_ERROR_DELAY_MS;
      this.show("loading");
      void this.load();
    });
  }

  connectedCallback(): void {
    document.addEventListener("visibilitychange", this.onVisibility);
    this.applyTheme();
    this.applyLang();
    this.restart();
  }

  disconnectedCallback(): void {
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.generation++;
    window.clearTimeout(this.timer);
  }

  attributeChangedCallback(name: string): void {
    // Before the element is on a page there is nothing to update; connectedCallback reads all three.
    if (!this.isConnected) return;
    if (name === "theme") this.applyTheme();
    else if (name === "lang") this.applyLang();
    else if (name === "link" && parseLinkId(this.getAttribute("link")) !== this.linkId) this.restart();
  }

  /* ---- reading ---- */

  private restart(): void {
    this.generation++;
    window.clearTimeout(this.timer);
    this.link = null;
    this.shownPhase = null;
    this.emittedStatus = null;
    this.errorDelay = FIRST_ERROR_DELAY_MS;
    const raw = this.getAttribute("link");
    this.linkId = parseLinkId(raw);
    if (!this.linkId) {
      if (this.warnedFor !== raw) {
        this.warnedFor = raw;
        console.warn('[cosmos-pay] <cosmos-pay-checkout> needs a "link" attribute with a payment link id.');
      }
      this.show("not-found");
      return;
    }
    this.show("loading");
    void this.load();
  }

  private schedule(ms: number): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.load(), ms);
  }

  private async load(): Promise<void> {
    window.clearTimeout(this.timer);
    const id = this.linkId;
    if (!id || !this.isConnected) return;
    // A hidden tab does not need a live status; it reads again the moment it is shown.
    if (document.hidden && this.link) return;
    const generation = this.generation;
    const result = await fetchPaymentLink(PAYMENTS_API_URL, id);
    if (generation !== this.generation) return;
    switch (result.kind) {
      case "ok":
        this.errorDelay = FIRST_ERROR_DELAY_MS;
        this.link = result.link;
        this.render(result.link);
        return;
      case "not-found":
        this.link = null;
        this.show("not-found");
        return;
      case "rate-limited":
        if (!this.link) this.showError("rate-limited");
        this.schedule(result.retryAfterMs);
        return;
      default:
        // Keep showing the last good state if there is one; the next read may succeed.
        if (!this.link) this.showError("error");
        this.schedule(this.errorDelay);
        this.errorDelay = Math.min(this.errorDelay * 2, ERROR_RETRY_MAX_MS);
    }
  }

  private onVisibility = (): void => {
    if (!document.hidden && this.link && nextPollDelay(phaseOf(this.link)) !== null) void this.load();
  };

  /* ---- drawing ---- */

  private show(state: State): void {
    for (const name of STATES) this.states[name].hidden = name !== state;
  }

  private showError(kind: "error" | "rate-limited"): void {
    this.errorKind = kind;
    this.ui.errorBody.textContent = kind === "rate-limited" ? this.t.checkout.rateLimited : this.t.checkout.errorBody;
    this.show("error");
  }

  private applyTheme(): void {
    this.card.dataset.theme = parseTheme(this.getAttribute("theme"));
  }

  /* The fixed strings; render() writes the ones that depend on the link. */
  private applyLang(): void {
    this.locale = resolveLang(this.getAttribute("lang"), browserLanguages());
    this.t = EMBED_MESSAGES[this.locale];
    const t = this.t.checkout;
    const ui = this.ui;
    this.card.lang = this.locale;
    ui.eyebrow.textContent = t.eyebrow;
    ui.loadingText.textContent = t.loading;
    ui.notFoundTitle.textContent = t.notFoundTitle;
    ui.notFoundBody.textContent = t.notFoundBody;
    ui.errorTitle.textContent = t.errorTitle;
    ui.errorBody.textContent = this.errorKind === "rate-limited" ? t.rateLimited : t.errorBody;
    ui.retry.textContent = t.retry;
    ui.testnet.textContent = t.testnet;
    ui.hint.textContent = t.anyAmountHint;
    ui.qr.alt = t.qrAlt;
    ui.wallet.textContent = t.openWallet;
    ui.network.label.textContent = t.network;
    ui.asset.label.textContent = t.asset;
    ui.expires.label.textContent = t.expires;
    ui.by.textContent = this.t.by;
    if (this.link) {
      this.shownPhase = null;
      this.render(this.link);
    }
  }

  private render(l: PaymentLink): void {
    const t = this.t.checkout;
    const ui = this.ui;
    const phase = phaseOf(l);
    this.show("link");

    ui.testnet.hidden = l.network !== "testnet";
    const amount = amountLabel(l);
    ui.amount.textContent = amount ?? t.anyAmount;
    ui.hint.hidden = amount !== null;
    ui.msg.textContent = l.msg ?? "";
    ui.msg.hidden = !l.msg;

    // Written on a change only, or the live region repeats itself on every read.
    if (phase !== this.shownPhase) {
      ui.status.textContent = t.phase[phase];
      ui.status.dataset.phase = phase;
      ui.statusBody.textContent = t.body[phase];
      this.shownPhase = phase;
    }

    // Only an open link is payable: processing is paid already, and expired, failed and
    // cancelled must not invite a payment the merchant no longer expects.
    ui.pay.hidden = phase !== "open";
    if (ui.qr.getAttribute("src") !== l.qr) ui.qr.src = l.qr;
    ui.wallet.href = l.uri;

    const tier = l.network === "public" ? t.mainnet : t.testnetTier;
    ui.network.value.textContent = `${chainName(l.chain)} · ${tier}`;
    ui.asset.value.textContent = l.assetIssuer ? `${assetSymbol(l)} · ${shortAddress(l.assetIssuer)}` : assetSymbol(l);

    const ends = l.expiresAt ? Date.parse(l.expiresAt) : NaN;
    const hasDeadline = Number.isFinite(ends);
    ui.expires.row.hidden = !hasDeadline || phase !== "open";
    if (hasDeadline) {
      const at = new Date(ends);
      ui.expiresTime.dateTime = at.toISOString();
      ui.expiresTime.textContent = new Intl.DateTimeFormat(this.locale, { dateStyle: "medium", timeStyle: "short" }).format(at);
    }

    if (l.status !== this.emittedStatus) {
      this.emittedStatus = l.status;
      emitStatus(this, l.id, l.status);
    }

    const delay = nextPollDelay(phase);
    if (delay === null) {
      window.clearTimeout(this.timer);
      return;
    }
    // An open link flips to expired at its deadline, without waiting for the next read.
    const untilDeadline = phase === "open" && hasDeadline ? ends - Date.now() : Infinity;
    this.schedule(Math.max(MIN_DELAY_MS, Math.min(delay, untilDeadline)));
  }
}
