/* checkout.ts: the browser half of /{id} and /preview/{design}.
 *
 * Reads the payment link from the gateway, mounts the design the merchant picked (one of
 * the <template>s Checkout.astro served), fills it, and keeps reading the link until it
 * settles (cadence in nextPollDelay). Every value from the network goes through
 * parsePaymentLink and lands in the DOM as textContent or as an attribute that was
 * validated first (the URI scheme, the QR data URL, the explorer URL), never as HTML.
 *
 * Why the browser and not the server: the gateway rate-limits this public read per client
 * address. Proxied through this site, every payer would share one budget.
 *
 * A preview page (data-preview) draws src/lib/payments/preview.ts's sample instead, reads
 * nothing and leaves every wallet button inert.
 *
 * A Stellar link with a merchant fee (`payerAccountRequired`) cannot be one wallet link: the
 * page asks for the payer's account (typed, or Freighter's), has the gateway build the
 * envelope with both payments, then shows its QR and wallet link, or lets Freighter sign it
 * and submits it to Horizon. Until then there is no QR, and never a manual transfer: paying
 * by hand would skip the fee and leave the link unpaid.
 *
 * Opened as a popup by a merchant's `<cosmos-pay-button>` (src/embed), the page also tells
 * its opener each status change (src/lib/payments/embed-protocol.ts): the id and the status,
 * nothing else.
 */
import {
  assetSymbol,
  buildPayerTransaction,
  canPayWithExtension,
  chainName,
  countdown,
  explorerTxUrl,
  fetchPaymentLink,
  isStellarAccount,
  nextPollDelay,
  payerTotal,
  phaseOf,
  shortAddress,
  submitSignedTransaction,
  webWalletUrl,
  type LinkStatus,
  type PaymentLink,
  type Phase,
} from "@/lib/payments/payment-link";
import { DEFAULT_CHECKOUT_THEME, isCheckoutTheme, type CheckoutTheme } from "@/lib/payments/checkout-themes";
import { statusMessage } from "@/lib/payments/embed-protocol";
import { previewLink } from "@/lib/payments/preview";
import { signWithFreighter } from "@/lib/wallets/freighter";

interface Runtime {
  phase: Record<Phase, string>;
  body: Record<Phase, string>;
  anyAmount: string;
  mainnet: string;
  testnetTier: string;
  copy: string;
  copied: string;
  extOpening: string;
  extSent: string;
  extFailed: string;
  errorBody: string;
  rateLimited: string;
  timerLabel: string;
  previewInert: string;
  feeIncluded: string;
  payerBuilding: string;
  payerReady: string;
  payerInvalid: string;
  payerFailed: string;
  payerClosed: string;
  payerChange: string;
  payerSubmit: string;
  signing: string;
  signSent: string;
  signFailed: string;
  signWrongNetwork: string;
  freighterMissing: string;
}

/* The envelope built for this page's payer (a Stellar link with a merchant fee). */
interface PayerEnvelope {
  account: string;
  uri: string;
  qr: string;
  xdr: string;
}

type Method = "qr" | "wallet" | "manual";
const METHODS: Method[] = ["qr", "wallet", "manual"];

/* A network failure retries on its own, backing off to this ceiling. */
const ERROR_RETRY_MAX_MS = 60_000;
/* How long "Copied" stays on a copy button. */
const COPIED_MS = 2_000;
/* The extension's content script injects window.cosmosWallet shortly after page start. */
const EXTENSION_WAIT_MS = 900;

export function startCheckout(): void {
  const root = document.getElementById("checkout");
  const mount = root?.querySelector<HTMLElement>("[data-mount]");
  const i18nEl = document.getElementById("checkout-i18n");
  const errorBody = root?.querySelector<HTMLElement>('[data-slot="error-body"]');
  if (!root || !mount || !i18nEl || !errorBody) return;

  const id = root.dataset.id || "";
  const apiBase = root.dataset.api || "";
  const walletWeb = root.dataset.walletWeb || "";
  const lang = root.dataset.lang || "en";
  const preview = isCheckoutTheme(root.dataset.preview) ? root.dataset.preview : null;
  const t = JSON.parse(i18nEl.textContent || "{}") as Runtime;

  /* Slots live in the mounted design; a design may draw a slot more than once (the receipt
     repeats the amount) or not at all. */
  const all = <T extends HTMLElement = HTMLElement>(sel: string) => [...mount.querySelectorAll<T>(sel)];
  const slots = <T extends HTMLElement = HTMLElement>(name: string) => all<T>(`[data-slot="${name}"]`);
  const text = (name: string, value: string) => slots(name).forEach((el) => { el.textContent = value; });
  const toggle = (sel: string, hidden: boolean) => all(sel).forEach((el) => { el.hidden = hidden; });
  const rows = (name: string, hidden: boolean) => toggle(`[data-row="${name}"]`, hidden);

  let link: PaymentLink | null = null;
  let design: CheckoutTheme | null = null;
  let method: Method = "qr";
  let timer: number | undefined;
  let ticker: number | undefined;
  let errorDelay = 5_000;
  let lastPhase: Phase | null = null;
  let lastMinute = -1;
  let toldOpener: LinkStatus | null = null;
  let payerEnvelope: PayerEnvelope | null = null;

  function show(state: "loading" | "not-found" | "error" | "link") {
    root!.querySelectorAll<HTMLElement>(":scope > [data-state]").forEach((el) => {
      el.hidden = el.dataset.state !== state;
    });
  }

  /* Mount the design's template once, and again only if the merchant changes it. */
  function mountDesign(theme: CheckoutTheme) {
    if (design === theme) return;
    const template =
      document.querySelector<HTMLTemplateElement>(`template[data-design="${theme}"]`) ??
      document.querySelector<HTMLTemplateElement>(`template[data-design="${DEFAULT_CHECKOUT_THEME}"]`);
    if (!template) return;
    mount!.replaceChildren(template.content.cloneNode(true));
    root!.dataset.design = theme;
    design = theme;
    lastPhase = null;
    lastMinute = -1;
    extensionChecked = false;
    selectMethod(method, false);
  }

  function schedule(ms: number) {
    window.clearTimeout(timer);
    timer = window.setTimeout(load, ms);
  }

  async function load() {
    window.clearTimeout(timer);
    // A hidden tab does not need a live status; it reads again the moment it is shown.
    if (document.hidden && link) return;
    const result = await fetchPaymentLink(apiBase, id);
    switch (result.kind) {
      case "ok":
        errorDelay = 5_000;
        link = result.link;
        render(link);
        return;
      case "not-found":
        link = null;
        show("not-found");
        return;
      case "rate-limited":
        if (!link) {
          errorBody!.textContent = t.rateLimited;
          show("error");
        }
        schedule(result.retryAfterMs);
        return;
      default:
        // Keep showing the last good state if there is one; the next read may succeed.
        if (!link) {
          errorBody!.textContent = t.errorBody;
          show("error");
        }
        schedule(errorDelay);
        errorDelay = Math.min(errorDelay * 2, ERROR_RETRY_MAX_MS);
    }
  }

  function render(l: PaymentLink) {
    mountDesign(l.checkoutTheme);
    const phase = phaseOf(l);
    show("link");

    toggle('[data-slot="testnet"]', l.network !== "testnet");
    // What the payer sends: with a merchant fee paid on top, the amount plus it.
    const total = payerTotal(l);
    const amount = total ? `${total} ${assetSymbol(l)}` : null;
    const fee = l.merchantFee;
    text("fee-included", fee ? t.feeIncluded.replace("{amount}", `${fee.amount} ${assetSymbol(l)}`) : "");
    toggle('[data-slot="fee-included"]', !fee);
    text("amount", amount ?? t.anyAmount);
    text("total", amount ?? t.anyAmount);
    toggle('[data-slot="amount-hint"]', amount !== null);
    text("msg", l.msg ?? "");
    toggle('[data-slot="msg"]', !l.msg);
    text("desc", l.msg ?? "");
    rows("desc", !l.msg);

    slots("phase").forEach((pill) => {
      pill.textContent = t.phase[phase];
      pill.dataset.phase = phase;
    });
    // Re-announce only on a change, or a screen reader repeats it every poll.
    if (phase !== lastPhase) text("phase-body", t.body[phase]);
    lastPhase = phase;
    root!.dataset.phase = phase;

    // Only an open link is payable. Processing has been paid already; expired, failed and
    // cancelled must not invite a payment the merchant no longer expects.
    toggle("[data-open-only]", phase !== "open");
    // A link that builds its payer's envelope: the account step, then that envelope's QR and
    // wallet link (the stored `uri` is this page). `data-payer` lets the stylesheet hide the
    // QR and the wallet buttons until the envelope exists.
    const payerLink = l.payerAccountRequired;
    if (payerLink) root!.dataset.payer = payerEnvelope ? "ready" : "needed";
    else delete root!.dataset.payer;
    toggle("[data-payer-step]", !payerLink || phase !== "open");
    all<HTMLButtonElement>('[data-action="sign-freighter"]').forEach((b) => { b.hidden = !payerEnvelope; });
    const walletUri = payerLink ? payerEnvelope?.uri ?? null : l.uri;
    slots<HTMLImageElement>("qr").forEach((img) => { img.src = payerLink ? payerEnvelope?.qr ?? l.qr : l.qr; });
    slots<HTMLAnchorElement>("open-wallet").forEach((a) => {
      if (preview) inert(a);
      else if (walletUri) a.href = walletUri;
      else a.removeAttribute("href");
    });
    const web = walletWeb && !preview && walletUri ? webWalletUrl(walletWeb, { chain: l.chain, uri: walletUri }) : null;
    slots<HTMLAnchorElement>("web-wallet").forEach((a) => {
      a.hidden = !web;
      if (web) a.href = web;
    });
    toggle('[data-slot="tx-note"]', l.kind !== "TX");
    // A TX link carries a transaction prepared for one payer: there is nothing to send by hand.
    // Nor on a link with a merchant fee: a transfer by hand would skip the fee.
    const noManual = l.kind === "TX" || payerLink;
    rows("manual", noManual);
    if (noManual && method === "manual") selectMethod("qr", false);

    text("pay-to", l.payTo);
    text("pay-to-short", shortAddress(l.payTo));
    // The memo is what matches a Stellar payment to this link. Elsewhere it is only the
    // link's internal key (Solana matches by reference, Monad by deposit address).
    rows("memo", l.chain !== "stellar");
    text("memo", l.memo);
    text("memo-text", l.memo);
    rows("amount", !l.amount);
    text("amount-value", l.amount ?? "");
    const tier = l.network === "public" ? t.mainnet : t.testnetTier;
    text("network", `${chainName(l.chain)} · ${tier}`);
    text("chain", chainName(l.chain));
    text("asset-symbol", assetSymbol(l));
    text("asset", l.assetIssuer ? `${assetSymbol(l)} · ${shortAddress(l.assetIssuer)}` : assetSymbol(l));

    const expires = l.expiresAt ? new Date(l.expiresAt) : null;
    rows("expires", !expires || phase !== "open");
    if (expires) {
      slots<HTMLTimeElement>("expires").forEach((el) => {
        el.dateTime = expires.toISOString();
        el.textContent = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(expires);
      });
    }
    tick();

    const explorer = explorerTxUrl(l);
    rows("tx", !explorer);
    if (explorer) slots<HTMLAnchorElement>("tx").forEach((a) => { a.href = explorer; });

    if (!preview) {
      tellOpener(l);
      const delay = nextPollDelay(phase);
      if (delay !== null) {
        // An open link flips to expired locally at its deadline, without waiting for a read.
        const untilExpiry = phase === "open" && expires ? expires.getTime() - Date.now() : Infinity;
        schedule(Math.max(250, Math.min(delay, untilExpiry)));
      }
    }
    offerExtension(l, phase);
  }

  /* ---- the merchant page that opened this one (<cosmos-pay-button>) ----
     Only with an opener, and only when the server's status changes (not the locally
     derived phase: the merchant's page gets what the API would answer). targetOrigin "*"
     because the opener is any merchant's site and this page cannot know which; that is
     acceptable only because the payload is the public id and status, which anyone holding
     the id already reads from the public GET /v1/payment-links/{id}. Never add the URI,
     the address, the amount or anything else to it. */
  function tellOpener(l: PaymentLink) {
    if (l.status === toldOpener) return;
    const opener = window.opener as Window | null;
    if (!opener || opener === window) return;
    toldOpener = l.status;
    try {
      opener.postMessage(statusMessage(l.id, l.status), "*");
    } catch {
      /* the opener navigated away or closed: nobody to tell */
    }
  }

  /* ---- countdown ---- */
  function tick() {
    window.clearTimeout(ticker);
    const timers = slots("timer");
    const left = link && phaseOf(link) === "open" ? countdown(link.expiresAt) : null;
    timers.forEach((el) => { el.hidden = !left; });
    if (!left || !link) return;
    slots("digits").forEach((el) => {
      el.replaceChildren(
        ...[...left.digits].map((ch) => {
          const span = document.createElement("span");
          span.className = ch === ":" ? "ck-sep" : "ck-d";
          span.textContent = ch;
          return span;
        }),
      );
    });
    // The label is what a screen reader reads; refreshing it every second is noise.
    const minute = Math.floor(left.seconds / 60);
    if (minute !== lastMinute) {
      timers.forEach((el) => el.setAttribute("aria-label", t.timerLabel.replace("{time}", left.digits)));
      lastMinute = minute;
    }
    if (left.seconds === 0) {
      // The deadline passed: draw it expired now (a real link is also read again by then).
      render(link);
      return;
    }
    ticker = window.setTimeout(tick, 1000 - (Date.now() % 1000));
  }

  /* ---- payment methods (the split design's tabs) ---- */
  function selectMethod(next: Method, focus: boolean) {
    method = next;
    root!.dataset.method = next;
    all<HTMLButtonElement>("[data-method-tab]").forEach((tab) => {
      const on = tab.dataset.methodTab === next;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    all("[data-method-panel]").forEach((panel) => { panel.hidden = panel.dataset.methodPanel !== next; });
  }

  function availableMethods(): Method[] {
    return METHODS.filter((m) => {
      const tab = mount!.querySelector<HTMLElement>(`[data-method-tab="${m}"]`);
      return tab && !tab.hidden;
    });
  }

  /* ---- preview: the buttons are there to be seen, not used ---- */
  function inert(a: HTMLAnchorElement) {
    a.removeAttribute("href");
    a.setAttribute("aria-disabled", "true");
    a.title = t.previewInert;
  }

  /* ---- Cosmos Wallet extension (Stellar `pay` links only) ---- */
  let extensionChecked = false;
  function offerExtension(l: PaymentLink, phase: Phase) {
    const buttons = all<HTMLButtonElement>('[data-action="pay-extension"]');
    if (preview || phase !== "open" || !canPayWithExtension(l)) {
      buttons.forEach((b) => { b.hidden = true; });
      return;
    }
    if (window.cosmosWallet) {
      buttons.forEach((b) => { b.hidden = false; });
      return;
    }
    if (extensionChecked) return;
    extensionChecked = true;
    const reveal = () => {
      if (window.cosmosWallet && link && phaseOf(link) === "open") {
        all<HTMLButtonElement>('[data-action="pay-extension"]').forEach((b) => { b.hidden = false; });
      }
    };
    window.addEventListener("cosmosWallet#initialized", reveal, { once: true });
    window.setTimeout(reveal, EXTENSION_WAIT_MS);
  }

  async function payWithExtension(button: HTMLButtonElement) {
    if (!link || !window.cosmosWallet) return;
    button.disabled = true;
    text("ext-status", t.extOpening);
    try {
      await window.cosmosWallet.requestPayment(link.uri);
      text("ext-status", t.extSent);
      void load();
    } catch {
      text("ext-status", t.extFailed);
    } finally {
      button.disabled = false;
    }
  }

  /* ---- the payer of a Stellar link with a merchant fee ---- */
  const payerStatus = (message: string) => text("payer-status", message);

  async function preparePayer(form: HTMLFormElement) {
    if (!link || preview) return;
    const input = form.querySelector<HTMLInputElement>("input[name=account]");
    const submit = form.querySelector<HTMLButtonElement>("[data-payer-submit]");
    const account = input?.value.trim() ?? "";
    if (!isStellarAccount(account)) {
      input?.setAttribute("aria-invalid", "true");
      payerStatus(t.payerInvalid);
      input?.focus();
      return;
    }
    input?.removeAttribute("aria-invalid");
    if (submit) submit.disabled = true;
    payerStatus(t.payerBuilding);
    const result = await buildPayerTransaction(apiBase, id, account);
    if (submit) submit.disabled = false;
    switch (result.kind) {
      case "ok":
        payerEnvelope = { account, uri: result.uri, qr: result.qr, xdr: result.xdr };
        payerStatus(t.payerReady);
        if (submit) submit.textContent = t.payerChange;
        render(link);
        return;
      case "closed":
        payerStatus(t.payerClosed);
        void load();
        return;
      case "rate-limited":
        payerStatus(t.rateLimited);
        return;
      default:
        payerEnvelope = null;
        input?.setAttribute("aria-invalid", "true");
        payerStatus(t.payerFailed);
        render(link);
    }
  }

  /* Freighter's account, read with the payer's consent, fills the step and builds the envelope. */
  async function useFreighter(button: HTMLButtonElement) {
    const form = button.closest<HTMLFormElement>("[data-payer-step]");
    if (!form) return;
    button.disabled = true;
    try {
      const api = await import("@stellar/freighter-api");
      const connected = await api.isConnected().catch(() => ({ isConnected: false }));
      if (!connected.isConnected) {
        payerStatus(t.freighterMissing);
        return;
      }
      const access = await api.requestAccess().catch(() => ({ address: "" }));
      if (!access.address) {
        payerStatus(t.signFailed);
        return;
      }
      const input = form.querySelector<HTMLInputElement>("input[name=account]");
      if (input) input.value = access.address;
      await preparePayer(form);
    } finally {
      button.disabled = false;
    }
  }

  /* Freighter signs the envelope here and the page submits it; the link then settles from the
     ledger like any other payment. */
  async function signHere(button: HTMLButtonElement) {
    if (!link || !payerEnvelope) return;
    button.disabled = true;
    payerStatus(t.signing);
    try {
      const signed = await signWithFreighter(payerEnvelope.xdr, link.network, payerEnvelope.account);
      if (!signed.ok) {
        const tier = link.network === "public" ? t.mainnet : t.testnetTier;
        payerStatus(
          signed.reason === "missing" ? t.freighterMissing
            : signed.reason === "wrongNetwork" ? t.signWrongNetwork.replace("{network}", tier)
            : t.signFailed,
        );
        return;
      }
      if (!(await submitSignedTransaction(link.network, signed.signedXdr))) {
        payerStatus(t.signFailed);
        return;
      }
      payerStatus(t.signSent);
      void load();
    } finally {
      button.disabled = false;
    }
  }

  async function copy(button: HTMLButtonElement) {
    const value = mount!.querySelector(`[data-slot="${button.dataset.copy}"]`)?.textContent || "";
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = t.copied;
      window.setTimeout(() => { button.textContent = t.copy; }, COPIED_MS);
    } catch {
      /* clipboard blocked: the value stays selectable on screen */
    }
  }

  /* One listener for every design: the mounted template's elements come and go. */
  root.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLElement>("[data-copy], [data-action], [data-method-tab], [aria-disabled='true']");
    if (!button) return;
    if (button.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
    } else if (button.dataset.copy) {
      void copy(button as HTMLButtonElement);
    } else if (button.dataset.methodTab) {
      selectMethod(button.dataset.methodTab as Method, false);
    } else if (button.dataset.action === "pay-extension") {
      void payWithExtension(button as HTMLButtonElement);
    } else if (button.dataset.action === "payer-freighter") {
      void useFreighter(button as HTMLButtonElement);
    } else if (button.dataset.action === "sign-freighter") {
      void signHere(button as HTMLButtonElement);
    } else if (button.dataset.action === "retry") {
      errorDelay = 5_000;
      show("loading");
      void load();
    }
  });

  root.addEventListener("submit", (e) => {
    const form = (e.target as HTMLElement).closest<HTMLFormElement>("[data-payer-step]");
    if (!form) return;
    e.preventDefault();
    void preparePayer(form);
  });

  /* Arrow keys move between the method tabs (WAI-ARIA tabs pattern, automatic activation). */
  root.addEventListener("keydown", (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-method-tab]");
    if (!tab) return;
    const list = availableMethods();
    const at = list.indexOf(tab.dataset.methodTab as Method);
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    let next: Method | undefined;
    if (step) next = list[(at + step + list.length) % list.length];
    else if (e.key === "Home") next = list[0];
    else if (e.key === "End") next = list[list.length - 1];
    if (!next) return;
    e.preventDefault();
    selectMethod(next, true);
  });

  if (preview) {
    link = previewLink(preview);
    render(link);
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && link && nextPollDelay(phaseOf(link)) !== null) void load();
  });

  void load();
}
