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
 * While the link is open the page also tells the gateway what the payer does with a wallet
 * (opened, back without paying, sent: reportCheckoutEvent), for the merchant to follow a payment
 * that is not on-chain yet. Informational only: the status still follows the chain.
 *
 * A link that offers it (`crossChainPayment`) can also be paid from another network
 * (src/lib/payments/deposits.ts, CrossChainStep.astro): the payer picks a network and a token,
 * names their refund address there, sees what to send, and gets a deposit address made for this
 * payment, which the page then follows (its id is kept in sessionStorage, so a reload shows the
 * same address). On a network with no wallet link of its own that is the only way to pay, and the
 * link's own QR and transfer are not drawn.
 *
 * Before any way to pay is shown, the page asks for the payer's email (EmailStep.astro), for the
 * receipt the server sends once the payment is confirmed. It is one checkout session: the server
 * answers a token (`recordPayer`) that this page keeps in memory and sessionStorage and sends on its
 * wallet events and deposits, so the receipt goes to this session's email. Another visitor's
 * session never blocks this one. A wallet link scanned outside this page carries no email; nothing
 * here can change that.
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
  reportCheckoutEvent,
  shortAddress,
  submitSignedTransaction,
  webWalletUrl,
  type CheckoutEvent,
  type LinkStatus,
  type PaymentLink,
  type Phase,
} from "@/lib/payments/payment-link";
import { DEFAULT_CHECKOUT_THEME, isCheckoutTheme, type CheckoutTheme } from "@/lib/payments/checkout-themes";
import {
  assetRef,
  createDeposit,
  depositNetworks,
  depositPhase,
  durationLabel,
  fetchDeposit,
  fetchDepositAssets,
  isPayerAmount,
  isPayerEmail,
  isPayerToken,
  nextDepositPollDelay,
  quoteDeposit,
  recordPayer,
  routeRefusal,
  type DepositAsset,
  type DepositChoice,
  type DepositFailure,
  type DepositPhase,
  type DepositQuote,
  type DepositRoute,
  type PaymentDeposit,
} from "@/lib/payments/deposits";
import { isDepositNetwork, isNetwork, isNetworkAddress, networkName, type NetworkId } from "@/lib/chains";
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
  email: EmailCopy;
  xc: XcCopy;
}

/* The payer's email for the receipt: EmailStep.astro's copy that the script writes. */
interface EmailCopy {
  body: string;
  saving: string;
  invalid: string;
  failed: string;
  given: string;
}

/* Paying from another network: CrossChainStep.astro's copy that the script writes. */
interface XcCopy {
  network: string;
  asset: string;
  choose: string;
  refund: string;
  refundInvalid: string;
  pick: string;
  quote: string;
  quoting: string;
  create: string;
  creating: string;
  timeValue: string;
  depositHint: string;
  refused: string;
  unavailable: string;
  closed: string;
  busy: string;
  /* A 429 on opening a deposit address: when to come back, nothing about the link. */
  later: string;
  error: string;
  only: string;
  /* A link without an amount: what the payer types, in the link's asset. */
  amount: string;
  amountInvalid: string;
  /* A token the route cannot take for this amount: beside it in the list, and why under the lists. */
  routeOff: string;
  routeNote: string;
  phase: Record<DepositPhase, string>;
  body: Record<DepositPhase, string>;
}

/* The pill colour a deposit's phase borrows from the link's phases (checkout.css). */
const XC_PILL: Record<DepositPhase, Phase> = {
  awaiting: "open",
  incomplete: "processing",
  converting: "processing",
  paid: "paid",
  refunded: "cancelled",
  failed: "failed",
  expired: "expired",
};
/* Where the open deposit's id is kept for this link, so a reload shows the same address. */
const depositKey = (linkId: string) => `cosmospay-deposit:${linkId}`;
/* Where the payer's email and this checkout session's token are kept for this link, so a reload
   neither asks again nor opens another session. */
const payerKey = (linkId: string) => `cosmospay-payer:${linkId}`;
const payerTokenKey = (linkId: string) => `cosmospay-payer-token:${linkId}`;

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
/* A wallet link or the web wallet counts as opened when the page loses the payer to it within
   this long of the click (a device without a wallet for the scheme does nothing). */
const WALLET_OPEN_MS = 2_500;
/* Back on the page, a payment sent just before gets a ledger to land before the page reports the
   wallet back without paying. */
const WALLET_BACK_GRACE_MS = 6_000;

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
  let lastBody: string | null = null;
  let lastMinute = -1;
  let toldOpener: LinkStatus | null = null;
  let payerEnvelope: PayerEnvelope | null = null;
  // The payer's email and this checkout session's token, asked before any way to pay (a reload
  // keeps both for this link; without a token the email is asked again).
  let payerToken: string | null = preview ? null : storedToken();
  let payerEmail: string | null = payerToken ? storedEmail() : null;
  let emailBusy = false;
  let emailEditing = false;
  // Paying from another network.
  let xcOpen = false;
  let xcAssets: DepositAsset[] | null = null;
  let xcRoutes: DepositRoute[] = [];
  let xcAmount = "";
  let xcAssetsLoading = false;
  let xcAssetsRetryAt = 0;
  let xcNetwork: NetworkId | "" = "";
  let xcAssetId = "";
  let xcRefund = "";
  let xcDefaulted = false;
  let xcBusy = false;
  let xcQuote: { key: string; quote: DepositQuote } | null = null;
  let xcDeposit: PaymentDeposit | null = null;
  let xcRestored = false;
  let xcTimer: number | undefined;
  let xcShownPhase: DepositPhase | null = null;

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
    lastBody = null;
    xcShownPhase = null;
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
        if (!xcRestored && link.crossChainPayment) void restoreDeposit();
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
    // No way to pay is shown before the payer gives an email for the receipt.
    const gated = emailGated(phase);
    // Re-announce only on a change, or a screen reader repeats it every poll. A link paid only
    // through a deposit address says so instead of "scan the code".
    const xcOnly = isDepositNetwork(l.chain);
    const body = gated ? t.email.body : xcOnly && phase === "open" ? t.xc.only : t.body[phase];
    if (body !== lastBody) text("phase-body", body);
    lastBody = body;
    root!.dataset.phase = phase;

    // Only an open link is payable. Processing has been paid already; expired, failed and
    // cancelled must not invite a payment the merchant no longer expects.
    toggle("[data-open-only]", phase !== "open" || gated);
    renderEmail(gated, phase);
    // A link that builds its payer's envelope: the account step, then that envelope's QR and
    // wallet link (the stored `uri` is this page). `data-payer` lets the stylesheet hide the
    // QR and the wallet buttons until the envelope exists.
    const payerLink = l.payerAccountRequired;
    if (payerLink) root!.dataset.payer = payerEnvelope ? "ready" : "needed";
    else delete root!.dataset.payer;
    toggle("[data-payer-step]", !payerLink || phase !== "open");
    all<HTMLButtonElement>('[data-action="sign-freighter"]').forEach((b) => { b.hidden = !payerEnvelope; });
    // Until the email is in, the page holds no QR or wallet link either, not only hidden ones.
    const walletUri = gated ? null : payerLink ? payerEnvelope?.uri ?? null : l.uri;
    slots<HTMLImageElement>("qr").forEach((img) => {
      if (gated) img.removeAttribute("src");
      else img.src = payerLink ? payerEnvelope?.qr ?? l.qr : l.qr;
    });
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
    // Nor on a Stellar or Solana link with a merchant fee: a transfer by hand would skip the
    // fee's payment, and the link settles only on both. A Monad link's deposit address splits
    // the fee itself, so sending it the total by hand pays both.
    const noManual = l.kind === "TX" || payerLink || (l.merchantFee !== null && l.chain !== "monad");
    rows("manual", noManual);
    if (noManual && method === "manual") selectMethod("qr", false);

    text("pay-to", l.payTo ?? "");
    text("pay-to-short", l.payTo ? shortAddress(l.payTo) : "");
    // The memo is what matches a Stellar payment to this link. Elsewhere it is only the
    // link's internal key (Solana matches by reference, Monad by deposit address).
    rows("memo", l.chain !== "stellar");
    text("memo", l.memo);
    text("memo-text", l.memo);
    rows("amount", !l.amount);
    // By hand the payer sends the total: the amount, plus a fee paid on top.
    text("amount-value", total ?? "");
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
    renderXc(l, phase, gated);
  }

  /* ---- the payer's email, for the receipt ---- */
  function storedEmail(): string | null {
    try {
      const value = window.sessionStorage.getItem(payerKey(id));
      return isPayerEmail(value) ? value : null;
    } catch {
      return null;
    }
  }

  function storedToken(): string | null {
    try {
      const value = window.sessionStorage.getItem(payerTokenKey(id));
      return isPayerToken(value) ? value : null;
    } catch {
      return null;
    }
  }

  function keepSession(email: string | null, token: string | null) {
    try {
      if (email && token) {
        window.sessionStorage.setItem(payerKey(id), email);
        window.sessionStorage.setItem(payerTokenKey(id), token);
      } else {
        window.sessionStorage.removeItem(payerKey(id));
        window.sessionStorage.removeItem(payerTokenKey(id));
      }
    } catch {
      /* storage blocked: the session is kept until the page closes */
    }
  }

  /* The server does not know this session (a token from another link, a cleared one): the
     email is asked again, which opens a new session. */
  function forgetSession() {
    payerToken = null;
    payerEmail = null;
    keepSession(null, null);
  }

  /* An open link asks for the email before it shows any way to pay; a preview never does. */
  function emailGated(phase: Phase): boolean {
    return !preview && phase === "open" && (payerEmail === null || payerToken === null || emailEditing);
  }

  function renderEmail(gated: boolean, phase: Phase) {
    toggle("[data-email-step]", !gated);
    toggle("[data-email-given]", gated || phase !== "open" || payerEmail === null);
    if (payerEmail) text("email-given", t.email.given.replace("{email}", payerEmail));
    all<HTMLInputElement>('input[name="email"]').forEach((input) => {
      if (!input.value && payerEmail) input.value = payerEmail;
      input.disabled = emailBusy;
    });
    all<HTMLButtonElement>("[data-email-submit]").forEach((b) => { b.disabled = emailBusy; });
  }

  const emailStatus = (message: string) => text("email-status", message);

  async function submitEmail(form: HTMLFormElement) {
    if (!link || preview || emailBusy) return;
    const input = form.querySelector<HTMLInputElement>('input[name="email"]');
    const email = input?.value.trim() ?? "";
    if (!isPayerEmail(email)) {
      input?.setAttribute("aria-invalid", "true");
      emailStatus(t.email.invalid);
      input?.focus();
      return;
    }
    input?.removeAttribute("aria-invalid");
    emailBusy = true;
    emailStatus(t.email.saving);
    render(link);
    const result = await recordPayer(apiBase, id, { email, lang, payerToken });
    emailBusy = false;
    switch (result.kind) {
      case "ok":
        payerEmail = email.toLowerCase();
        payerToken = result.value;
        emailEditing = false;
        keepSession(payerEmail, payerToken);
        emailStatus("");
        if (link) render(link);
        // The form is gone: focus moves to the line that replaced it.
        mount!.querySelector<HTMLButtonElement>('[data-action="email-change"]')?.focus();
        return;
      case "closed":
      case "not-found":
        emailStatus(t.payerClosed);
        void load();
        return;
      case "rate-limited":
        emailStatus(t.xc.later);
        break;
      case "refused":
        input?.setAttribute("aria-invalid", "true");
        emailStatus(t.email.invalid);
        break;
      default:
        emailStatus(t.email.failed);
    }
    if (link) render(link);
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

  /* ---- what the payer does with a wallet, told to the merchant's dashboard ----
     Only while the link is open, and never from a preview. A wallet link or the web wallet
     counts as opened once the page loses the payer to it (it hides or blurs right after the
     click), and as back without paying once the page is shown again and, a ledger later, the
     link is still open. The extension and Freighter answer for themselves. */
  let walletAway = false;
  let sentReported = false;
  let backCheck: number | undefined;
  function report(event: CheckoutEvent, proof: { address?: string | null; txHash?: string | null } = {}) {
    if (preview || !link || phaseOf(link) !== "open") return;
    if (event === "sent") sentReported = true;
    // The session's token goes with it, and what the wallet said it pays from or answered: that
    // proof, matched against the settlement, is what sends this session the receipt.
    void reportCheckoutEvent(apiBase, id, event, fetch, payerToken, proof);
  }

  function watchWalletLeave() {
    if (preview || walletAway) return;
    const stop = () => {
      window.clearTimeout(giveUp);
      window.removeEventListener("blur", left);
      document.removeEventListener("visibilitychange", hidden);
    };
    const left = () => {
      stop();
      if (walletAway) return;
      walletAway = true;
      report("walletOpened");
    };
    const hidden = () => { if (document.hidden) left(); };
    const giveUp = window.setTimeout(stop, WALLET_OPEN_MS);
    window.addEventListener("blur", left);
    document.addEventListener("visibilitychange", hidden);
  }

  function walletBack() {
    if (!walletAway || document.hidden) return;
    walletAway = false;
    window.clearTimeout(backCheck);
    backCheck = window.setTimeout(async () => {
      await load();
      if (!sentReported) report("walletClosed");
    }, WALLET_BACK_GRACE_MS);
  }

  /* ---- Cosmos Pay Wallet extension (Stellar `pay` links only) ---- */
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
    report("walletOpened");
    try {
      const res = (await window.cosmosWallet.requestPayment(link.uri)) as { hash?: unknown } | undefined;
      report("sent", { txHash: typeof res?.hash === "string" ? res.hash : null });
      text("ext-status", t.extSent);
      void load();
    } catch {
      report("walletClosed");
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
      let opened = false;
      const account = payerEnvelope.account;
      const signed = await signWithFreighter(payerEnvelope.xdr, link.network, account, () => {
        opened = true;
        // The account Freighter signs with, registered before the payment exists on-chain: a
        // proof registered after the transaction closed does not count for the receipt.
        report("walletOpened", { address: account });
      });
      if (!signed.ok) {
        if (opened) report("walletClosed");
        const tier = link.network === "public" ? t.mainnet : t.testnetTier;
        payerStatus(
          signed.reason === "missing" ? t.freighterMissing
            : signed.reason === "wrongNetwork" ? t.signWrongNetwork.replace("{network}", tier)
            : t.signFailed,
        );
        return;
      }
      if (!(await submitSignedTransaction(link.network, signed.signedXdr))) {
        report("walletClosed");
        payerStatus(t.signFailed);
        return;
      }
      report("sent", { address: account });
      payerStatus(t.signSent);
      void load();
    } finally {
      button.disabled = false;
    }
  }

  /* ---- paying from another network ---- */
  const xcText = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
  const xcStatus = (message: string, detail = "") => {
    text("xc-status", message);
    text("xc-detail", detail);
    toggle('[data-slot="xc-detail"]', !detail);
  };
  const xcSelected = (): DepositAsset | null => xcAssets?.find((a) => a.assetId === xcAssetId && a.chain === xcNetwork) ?? null;
  /* A link without an amount is paid for the amount the payer types, in the link's asset. */
  const xcOpenAmount = () => link !== null && link.amount === null;
  const xcChoice = (): DepositChoice | null => {
    const asset = xcSelected();
    if (!asset) return null;
    const choice: DepositChoice = { originChain: asset.chain, originAsset: assetRef(asset), refundTo: xcRefund.trim() };
    return xcOpenAmount() ? { ...choice, amount: xcAmount.trim() } : choice;
  };
  const xcKey = (c: DepositChoice) => `${c.originChain}|${c.originAsset}|${c.refundTo}|${c.amount ?? ""}`;
  const xcRefused = (a: DepositAsset) => routeRefusal(xcRoutes, a);

  function renderXc(l: PaymentLink, phase: Phase, gated: boolean) {
    const xcOnly = isDepositNetwork(l.chain);
    if (xcOnly) root!.dataset.xc = "only";
    else delete root!.dataset.xc;
    // A deposit already made stays on screen; a new one waits for the payer's email.
    const offered = !preview && l.crossChainPayment && ((phase === "open" && !gated) || xcDeposit !== null);
    toggle("[data-xc-step]", !offered);
    if (!offered) return;
    const open = xcOnly || xcOpen || xcDeposit !== null;
    all<HTMLButtonElement>('[data-action="xc-toggle"]').forEach((b) => b.setAttribute("aria-expanded", String(open)));
    toggle("[data-xc-body]", !open);
    if (!open) return;
    if (!xcAssets && !xcAssetsLoading && Date.now() >= xcAssetsRetryAt) void loadXcAssets();
    fillXcForm(l);
    renderXcDeposit();
  }

  async function loadXcAssets() {
    xcAssetsLoading = true;
    const result = await fetchDepositAssets(apiBase, id);
    xcAssetsLoading = false;
    if (result.kind === "ok") {
      xcAssets = result.value.assets;
      xcRoutes = result.value.routes;
      if (link) render(link);
      return;
    }
    xcStatus(xcFailure(result));
    // Asked again on a later read of the link, not on every one: never for a link that cannot be
    // paid this way, after the budget's wait when rate-limited, else after a short pause.
    xcAssetsRetryAt =
      result.kind === "unavailable" ? Infinity
        : result.kind === "rate-limited" ? Date.now() + result.retryAfterMs
          : Date.now() + 15_000;
    if (result.kind === "closed" || result.kind === "not-found") void load();
  }

  function xcFailure(f: DepositFailure): string {
    switch (f.kind) {
      case "unavailable": return t.xc.unavailable;
      case "closed": return t.xc.closed;
      case "busy": return t.xc.busy;
      case "rate-limited": return t.xc.later;
      case "refused": return t.xc.refused;
      default: return t.xc.error;
    }
  }

  /* The lists and the refund field, from the state (a design mounted again starts empty). */
  function fillXcForm(l: PaymentLink) {
    const netSelect = mount!.querySelector<HTMLSelectElement>("[data-xc-network]");
    const assetSelect = mount!.querySelector<HTMLSelectElement>("[data-xc-asset]");
    if (!netSelect || !assetSelect) return;
    const assets = xcAssets ?? [];
    // A link on a network paid only this way starts on its own token there, the cheapest way to
    // pay it, when the list has it and the route takes it for this amount; a Stellar, Solana or
    // Monad link starts on nothing.
    if (!xcDefaulted && assets.length) {
      xcDefaulted = true;
      if (isDepositNetwork(l.chain)) {
        const own = assets.find((a) => a.chain === l.chain && (l.assetIssuer ? a.contract?.toLowerCase() === l.assetIssuer.toLowerCase() : a.contract === null));
        if (own && !xcRefused(own)) { xcNetwork = own.chain; xcAssetId = own.assetId; }
      }
    }
    // The amount comes first on a link without one.
    const openAmount = l.amount === null;
    toggle("[data-xc-amount]", !openAmount);
    if (openAmount) text("xc-amount-label", xcText(t.xc.amount, { asset: assetSymbol(l) }));
    all<HTMLInputElement>('input[name="xcAmount"]').forEach((input) => {
      if (input.value !== xcAmount) input.value = xcAmount;
      input.disabled = xcBusy;
    });
    const networks = depositNetworks(assets);
    const netKey = networks.join(",");
    if (netSelect.dataset.filled !== netKey) {
      netSelect.replaceChildren(option("", t.xc.choose), ...networks.map((n) => option(n, networkName(n))));
      netSelect.dataset.filled = netKey;
    }
    netSelect.value = xcNetwork;
    netSelect.disabled = xcBusy || !networks.length;
    const onNetwork = assets.filter((a) => a.chain === xcNetwork);
    const assetKey = `${xcNetwork}:${onNetwork.map((a) => a.assetId).join(",")}:${xcRoutes.length}`;
    if (assetSelect.dataset.filled !== assetKey) {
      // A token the route cannot take for this amount is listed, disabled, saying so.
      assetSelect.replaceChildren(
        option("", t.xc.choose),
        ...onNetwork.map((a) => {
          const label = a.contract ? `${a.symbol} · ${shortAddress(a.contract, 4, 4)}` : a.symbol;
          const off = xcRefused(a) !== null;
          return option(a.assetId, off ? `${label} · ${t.xc.routeOff}` : label, off);
        }),
      );
      assetSelect.dataset.filled = assetKey;
    }
    assetSelect.value = xcAssetId;
    assetSelect.disabled = xcBusy || !onNetwork.length;
    // And why, under the lists, in the route's words.
    const notes = new Map<string, string>();
    for (const a of onNetwork) {
      const refusal = xcRefused(a);
      if (refusal && !notes.has(a.symbol)) {
        notes.set(a.symbol, `${xcText(t.xc.routeNote, { asset: a.symbol, network: networkName(a.chain) })} ${refusal.reason ?? ""}`.trim());
      }
    }
    const note = [...notes.values()].join(" ");
    text("xc-routes", note);
    toggle('[data-slot="xc-routes"]', !note);
    // The refund address is on the network the payer pays from, so it waits for that network.
    toggle("[data-xc-refund]", !xcNetwork);
    if (isNetwork(xcNetwork)) text("xc-refund-label", xcText(t.xc.refund, { network: networkName(xcNetwork) }));
    all<HTMLInputElement>('input[name="refundTo"]').forEach((input) => {
      if (input.value !== xcRefund) input.value = xcRefund;
      input.disabled = xcBusy;
    });
    // The quote shown is for the choice on screen, or there is none.
    const choice = xcChoice();
    const quoted = choice && xcQuote?.key === xcKey(choice) ? xcQuote.quote : null;
    toggle("[data-xc-quote]", !quoted);
    if (quoted) {
      text("xc-send", `${quoted.origin.amount} ${quoted.origin.asset} · ${networkName(quoted.origin.chain)}`);
      text("xc-fee", `${quoted.fee.amount} ${quoted.fee.asset}`);
      rows("xc-fee", quoted.fee.bps === 0);
      text("xc-time", xcText(t.xc.timeValue, { time: durationLabel(quoted.timeEstimateSeconds, lang) }));
    }
    all<HTMLButtonElement>("[data-xc-submit]").forEach((b) => {
      b.textContent = quoted ? t.xc.create : t.xc.quote;
      b.disabled = xcBusy;
    });
  }

  function option(value: string, label: string, disabled = false): HTMLOptionElement {
    const el = document.createElement("option");
    el.value = value;
    el.textContent = label;
    el.disabled = disabled;
    return el;
  }

  function renderXcDeposit() {
    const d = xcDeposit;
    toggle("[data-xc-form]", d !== null);
    toggle("[data-xc-deposit]", d === null);
    if (!d) {
      xcShownPhase = null;
      return;
    }
    const ph = depositPhase(d);
    slots("xc-phase").forEach((pill) => {
      pill.textContent = t.xc.phase[ph];
      pill.dataset.phase = XC_PILL[ph];
    });
    if (ph !== xcShownPhase) text("xc-phase-body", t.xc.body[ph]);
    xcShownPhase = ph;
    const payable = ph === "awaiting" || ph === "incomplete";
    toggle("[data-xc-payable]", !payable);
    slots<HTMLImageElement>("xc-qr").forEach((img) => { if (img.getAttribute("src") !== d.qr) img.src = d.qr; });
    slots<HTMLAnchorElement>("xc-open-wallet").forEach((a) => {
      a.hidden = !d.depositUri;
      if (d.depositUri) a.href = d.depositUri;
      else a.removeAttribute("href");
    });
    text("xc-amount", d.amountIn);
    text("xc-address", d.depositAddress);
    text("xc-deposit-hint", xcText(t.xc.depositHint, { asset: d.originAsset, network: networkName(d.originChain) }));
    rows("xc-memo", !d.depositMemo);
    text("xc-memo", d.depositMemo ?? "");
    const expires = new Date(d.expiresAt);
    rows("xc-expires", !payable);
    slots<HTMLTimeElement>("xc-expires").forEach((el) => {
      el.dateTime = expires.toISOString();
      el.textContent = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(expires);
    });
    const payout = d.destinationTxHashes.find((tx) => tx.explorerUrl)?.explorerUrl ?? null;
    rows("xc-tx", !payout);
    if (payout) slots<HTMLAnchorElement>("xc-tx").forEach((a) => { a.href = payout; });
    // Another network or token, while nothing is on its way: once a deposit is being converted
    // or the merchant is paid there is nothing to choose again.
    toggle('[data-action="xc-reset"]', ph === "converting" || ph === "paid");
  }

  function keepDeposit(depositId: string | null) {
    try {
      if (depositId) window.sessionStorage.setItem(depositKey(id), depositId);
      else window.sessionStorage.removeItem(depositKey(id));
    } catch {
      /* storage blocked: the deposit is followed until the page closes */
    }
  }

  async function restoreDeposit() {
    xcRestored = true;
    let depositId: string | null = null;
    try {
      depositId = window.sessionStorage.getItem(depositKey(id));
    } catch {
      depositId = null;
    }
    if (!depositId) return;
    const result = await fetchDeposit(apiBase, id, depositId);
    if (result.kind === "ok") {
      xcDeposit = result.value;
      if (link) render(link);
      scheduleDeposit();
    } else if (result.kind === "not-found") {
      keepDeposit(null);
    }
  }

  function scheduleDeposit(ms?: number) {
    window.clearTimeout(xcTimer);
    if (!xcDeposit) return;
    const delay = ms ?? nextDepositPollDelay(depositPhase(xcDeposit));
    if (delay === null) return;
    xcTimer = window.setTimeout(pollDeposit, delay);
  }

  async function pollDeposit() {
    window.clearTimeout(xcTimer);
    if (!xcDeposit || document.hidden) return;
    const before = depositPhase(xcDeposit);
    const result = await fetchDeposit(apiBase, id, xcDeposit.id);
    if (result.kind === "ok") {
      xcDeposit = result.value;
      const after = depositPhase(xcDeposit);
      if (link) render(link);
      // The merchant was paid: the link turns paid on its next read.
      if (after === "paid" && before !== "paid") void load();
      scheduleDeposit();
      return;
    }
    if (result.kind === "not-found") {
      xcDeposit = null;
      keepDeposit(null);
      if (link) render(link);
      return;
    }
    scheduleDeposit(result.kind === "rate-limited" ? result.retryAfterMs : 10_000);
  }

  async function submitXc() {
    if (!link || preview || xcBusy) return;
    if (!payerEmail || !payerToken) {
      // The email comes first (a deposit belongs to the checkout session that gave it).
      emailEditing = true;
      render(link);
      return;
    }
    if (xcOpenAmount() && !isPayerAmount(xcAmount)) {
      const amountInput = mount!.querySelector<HTMLInputElement>('input[name="xcAmount"]');
      amountInput?.setAttribute("aria-invalid", "true");
      xcStatus(t.xc.amountInvalid);
      amountInput?.focus();
      return;
    }
    const choice = xcChoice();
    const selected = xcSelected();
    if (!choice || !selected) {
      xcStatus(t.xc.pick);
      return;
    }
    const refusal = xcRefused(selected);
    if (refusal) {
      xcStatus(t.xc.refused, refusal.reason ?? "");
      return;
    }
    const input = mount!.querySelector<HTMLInputElement>('input[name="refundTo"]');
    if (!isNetworkAddress(choice.originChain, choice.refundTo)) {
      input?.setAttribute("aria-invalid", "true");
      xcStatus(xcText(t.xc.refundInvalid, { network: networkName(choice.originChain) }));
      input?.focus();
      return;
    }
    input?.removeAttribute("aria-invalid");
    const key = xcKey(choice);
    const creating = xcQuote?.key === key;
    xcBusy = true;
    xcStatus(creating ? t.xc.creating : t.xc.quoting);
    render(link);
    if (creating) {
      const result = await createDeposit(apiBase, id, choice, payerToken);
      xcBusy = false;
      if (result.kind === "ok") {
        xcDeposit = result.value;
        xcQuote = null;
        keepDeposit(xcDeposit.id);
        xcStatus("");
        if (link) render(link);
        scheduleDeposit();
        return;
      }
      afterXcFailure(result);
      return;
    }
    const result = await quoteDeposit(apiBase, id, choice);
    xcBusy = false;
    if (result.kind === "ok") {
      xcQuote = { key, quote: result.value };
      xcStatus("");
    } else {
      xcQuote = null;
      afterXcFailure(result);
    }
    if (link) render(link);
  }

  function afterXcFailure(f: DepositFailure) {
    if (f.kind === "session") {
      // The server no longer knows this session: the email step comes back, then a new session.
      forgetSession();
      xcStatus("");
      if (link) render(link);
      return;
    }
    // A refusal names why (a minimum this route has, a token it cannot take now) in the server's
    // own words, which name no provider; the payer can pick another network or token.
    xcStatus(xcFailure(f), f.kind === "refused" ? f.message : "");
    if (f.kind === "closed" || f.kind === "not-found") void load();
    else if (link) render(link);
  }

  function resetXc() {
    window.clearTimeout(xcTimer);
    xcDeposit = null;
    xcQuote = null;
    keepDeposit(null);
    xcStatus("");
    if (link) render(link);
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
    const button = target.closest<HTMLElement>("[data-copy], [data-action], [data-method-tab], [aria-disabled='true'], a[data-slot='open-wallet'], a[data-slot='web-wallet']");
    if (!button) return;
    if (button.getAttribute("aria-disabled") === "true") {
      e.preventDefault();
    } else if (button instanceof HTMLAnchorElement) {
      // The wallet link or the web wallet: the browser follows it, this page watches it leave.
      if (button.href) watchWalletLeave();
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
    } else if (button.dataset.action === "xc-toggle") {
      xcOpen = !xcOpen;
      if (link) render(link);
    } else if (button.dataset.action === "xc-reset") {
      resetXc();
    } else if (button.dataset.action === "email-change") {
      emailEditing = true;
      if (link) render(link);
      mount!.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
    } else if (button.dataset.action === "retry") {
      errorDelay = 5_000;
      show("loading");
      void load();
    }
  });

  root.addEventListener("submit", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-xc-form]")) {
      e.preventDefault();
      void submitXc();
      return;
    }
    const emailForm = target.closest<HTMLFormElement>("[data-email-step]");
    if (emailForm) {
      e.preventDefault();
      void submitEmail(emailForm);
      return;
    }
    const form = target.closest<HTMLFormElement>("[data-payer-step]");
    if (!form) return;
    e.preventDefault();
    void preparePayer(form);
  });

  /* The cross-chain choice lives in the state, so a design mounted again keeps it; a change drops
     the quote shown for the previous choice. */
  root.addEventListener("change", (e) => {
    const el = e.target as HTMLElement;
    if (el instanceof HTMLSelectElement && el.matches("[data-xc-network]")) {
      xcNetwork = isNetwork(el.value) ? el.value : "";
      const only = xcAssets?.filter((a) => a.chain === xcNetwork && !xcRefused(a)) ?? [];
      xcAssetId = only.length === 1 ? only[0].assetId : "";
    } else if (el instanceof HTMLSelectElement && el.matches("[data-xc-asset]")) {
      xcAssetId = el.value;
    } else {
      return;
    }
    xcStatus("");
    if (link) render(link);
  });
  root.addEventListener("input", (e) => {
    const el = e.target as HTMLElement;
    if (!(el instanceof HTMLInputElement) || !el.closest("[data-xc-form]")) return;
    if (el.name === "refundTo") xcRefund = el.value;
    else if (el.name === "xcAmount") xcAmount = el.value;
    else return;
    el.removeAttribute("aria-invalid");
    if (xcQuote) {
      xcQuote = null;
      if (link) render(link);
    }
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
    if (document.hidden) return;
    walletBack();
    if (link && nextPollDelay(phaseOf(link)) !== null) void load();
    if (xcDeposit && nextDepositPollDelay(depositPhase(xcDeposit)) !== null) void pollDeposit();
  });
  window.addEventListener("focus", walletBack);

  void load();
}
