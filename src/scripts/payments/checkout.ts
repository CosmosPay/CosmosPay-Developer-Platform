/* checkout.ts — the browser half of /{id}.
 *
 * Reads the payment link from the gateway, renders it into the shell [id].astro served,
 * and keeps reading it until it settles (cadence in nextPollDelay). Every value from the
 * network goes through parsePaymentLink and lands in the DOM as textContent or as an
 * attribute that was validated first (the URI scheme, the QR data URL, the explorer URL),
 * never as HTML.
 *
 * Why the browser and not the server: the gateway rate-limits this public read per client
 * address. Proxied through this site, every payer would share one budget.
 */
import {
  amountLabel,
  canPayWithExtension,
  chainName,
  explorerTxUrl,
  fetchPaymentLink,
  nextPollDelay,
  phaseOf,
  webWalletUrl,
  type PaymentLink,
  type Phase,
} from "@/lib/payments/payment-link";

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
}

/* A network failure retries on its own, backing off to this ceiling. */
const ERROR_RETRY_MAX_MS = 60_000;
/* How long "Copied" stays on a copy button. */
const COPIED_MS = 2_000;
/* The extension's content script injects window.cosmosWallet shortly after page start. */
const EXTENSION_WAIT_MS = 900;

export function startCheckout(): void {
  const root = document.getElementById("checkout");
  const i18nEl = document.getElementById("checkout-i18n");
  if (!root || !i18nEl) return;

  const id = root.dataset.id || "";
  const apiBase = root.dataset.api || "";
  const walletWeb = root.dataset.walletWeb || "";
  const lang = root.dataset.lang || "en";
  const t = JSON.parse(i18nEl.textContent || "{}") as Runtime;

  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const slot = <T extends HTMLElement = HTMLElement>(name: string) => $<T>(`[data-slot="${name}"]`);
  const row = (name: string) => $(`[data-row="${name}"]`);

  let link: PaymentLink | null = null;
  let timer: number | undefined;
  let errorDelay = 5_000;
  let lastPhase: Phase | null = null;

  function show(state: "loading" | "not-found" | "error" | "link") {
    root!.querySelectorAll<HTMLElement>("[data-state]").forEach((el) => {
      el.hidden = el.dataset.state !== state;
    });
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
          slot("error-body").textContent = t.rateLimited;
          show("error");
        }
        schedule(result.retryAfterMs);
        return;
      default:
        // Keep showing the last good state if there is one; the next read may succeed.
        if (!link) {
          slot("error-body").textContent = t.errorBody;
          show("error");
        }
        schedule(errorDelay);
        errorDelay = Math.min(errorDelay * 2, ERROR_RETRY_MAX_MS);
    }
  }

  function render(l: PaymentLink) {
    const phase = phaseOf(l);
    show("link");

    slot("testnet").hidden = l.network !== "testnet";
    const amount = amountLabel(l);
    slot("amount").textContent = amount ?? t.anyAmount;
    slot("amount-hint").hidden = amount !== null;
    slot("msg").textContent = l.msg ?? "";
    slot("msg").hidden = !l.msg;

    const pill = slot("phase");
    pill.textContent = t.phase[phase];
    pill.dataset.phase = phase;
    // Re-announce only on a change, or a screen reader repeats it every poll.
    if (phase !== lastPhase) slot("phase-body").textContent = t.body[phase];
    lastPhase = phase;

    // Only an open link is payable. Processing has been paid already; expired, failed and
    // cancelled must not invite a payment the merchant no longer expects.
    slot("pay-area").hidden = phase !== "open";
    slot<HTMLImageElement>("qr").src = l.qr;
    slot<HTMLAnchorElement>("open-wallet").href = l.uri;
    const web = walletWeb ? webWalletUrl(walletWeb, l) : null;
    const webLink = slot<HTMLAnchorElement>("web-wallet");
    webLink.hidden = !web;
    if (web) webLink.href = web;
    slot("tx-note").hidden = l.kind !== "TX";

    slot("pay-to").textContent = l.payTo;
    // The memo is what matches a Stellar payment to this link. Elsewhere it is only the
    // link's internal key (Solana matches by reference, Monad by deposit address).
    row("memo").hidden = l.chain !== "stellar";
    slot("memo").textContent = l.memo;
    slot("network").textContent = `${chainName(l.chain)} · ${l.network === "public" ? t.mainnet : t.testnetTier}`;

    const expires = l.expiresAt ? new Date(l.expiresAt) : null;
    row("expires").hidden = !expires || phase !== "open";
    if (expires) {
      const el = slot<HTMLTimeElement>("expires");
      el.dateTime = expires.toISOString();
      el.textContent = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(expires);
    }

    const explorer = explorerTxUrl(l);
    row("tx").hidden = !explorer;
    if (explorer) slot<HTMLAnchorElement>("tx").href = explorer;

    const delay = nextPollDelay(phase);
    if (delay !== null) {
      // An open link flips to expired locally at its deadline, without waiting for a read.
      const untilExpiry = phase === "open" && expires ? expires.getTime() - Date.now() : Infinity;
      schedule(Math.max(250, Math.min(delay, untilExpiry)));
    }
    offerExtension(l, phase);
  }

  /* ---- Cosmos Wallet extension (Stellar `pay` links only) ---- */
  let extensionChecked = false;
  function offerExtension(l: PaymentLink, phase: Phase) {
    const button = $<HTMLButtonElement>('[data-action="pay-extension"]');
    if (phase !== "open" || !canPayWithExtension(l)) {
      button.hidden = true;
      return;
    }
    if (window.cosmosWallet) {
      button.hidden = false;
      return;
    }
    if (extensionChecked) return;
    extensionChecked = true;
    const reveal = () => { if (window.cosmosWallet && link && phaseOf(link) === "open") button.hidden = false; };
    window.addEventListener("cosmosWallet#initialized", reveal, { once: true });
    window.setTimeout(reveal, EXTENSION_WAIT_MS);
  }

  $<HTMLButtonElement>('[data-action="pay-extension"]').addEventListener("click", async (e) => {
    const button = e.currentTarget as HTMLButtonElement;
    const status = slot("ext-status");
    if (!link || !window.cosmosWallet) return;
    button.disabled = true;
    status.textContent = t.extOpening;
    try {
      await window.cosmosWallet.requestPayment(link.uri);
      status.textContent = t.extSent;
      void load();
    } catch {
      status.textContent = t.extFailed;
    } finally {
      button.disabled = false;
    }
  });

  /* ---- copy buttons ---- */
  root.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = slot(button.dataset.copy || "").textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = t.copied;
        window.setTimeout(() => { button.textContent = t.copy; }, COPIED_MS);
      } catch {
        /* clipboard blocked: the value stays selectable on screen */
      }
    });
  });

  $('[data-action="retry"]').addEventListener("click", () => {
    errorDelay = 5_000;
    show("loading");
    void load();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && link && nextPollDelay(phaseOf(link)) !== null) void load();
  });

  void load();
}
