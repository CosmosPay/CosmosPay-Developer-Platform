/* pay-handler.ts is the browser half of /pay: register this page as the web+stellar:
   handler, show an incoming SEP-7 `pay` URI in full, and hand it to the Cosmos Wallet
   extension (or the web wallet when there is no extension) only on the payer's click. The
   URI arrives in the query string, which any site can choose, so it is never handed over on
   arrival. */
import { parseSep7Pay } from "@/lib/payments/sep7";
import { shortAddress } from "@/lib/payments/payment-link";

interface Runtime {
  activated: string;
  activateFail: string;
  paying: string;
  noExt: string;
  review: string;
  mainnet: string;
  testnet: string;
  success: string;
  hash: string;
  invalid: string;
}

/* The extension's content script injects window.cosmosWallet shortly after page start. */
const EXTENSION_WAIT_MS = 900;

export function startPayHandler(): void {
  const root = document.getElementById("pay");
  const i18nEl = document.getElementById("pay-i18n");
  if (!root || !i18nEl) return;
  const t = JSON.parse(i18nEl.textContent || "{}") as Runtime;
  const slot = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-slot="${name}"]`)!;
  const action = (name: string) => root.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;

  /* Register the protocol handler. This works on Chrome and Firefox because this is a
     regular https page, unlike the extension, which Chrome forbids from doing it. */
  action("register").addEventListener("click", () => {
    try {
      navigator.registerProtocolHandler("web+stellar", `${location.origin}/pay?uri=%s`);
      slot("register-status").textContent = t.activated;
    } catch (e) {
      slot("register-status").textContent = `${t.activateFail}: ${e instanceof Error ? e.message : String(e)}`;
    }
  });

  const qs = new URLSearchParams(location.search);
  const uri = (qs.get("uri") || qs.get("sep7") || "").trim();
  if (!uri) return;

  slot("incoming").hidden = false;
  const pay = parseSep7Pay(uri);
  if (!pay) {
    slot("status").textContent = t.invalid;
    return;
  }

  slot("dest").textContent = shortAddress(pay.destination, 10, 10);
  slot("amount").textContent = `${pay.amount || "-"} ${pay.asset}`;
  slot("network").textContent = `Stellar · ${pay.network === "testnet" ? t.testnet : t.mainnet}`;
  if (pay.memo) {
    slot("memo-row").hidden = false;
    slot("memo").textContent = pay.memo;
  }
  // The issuer is part of the asset: anyone can issue a "USDC".
  if (pay.assetIssuer) {
    slot("issuer-row").hidden = false;
    slot("issuer").textContent = shortAddress(pay.assetIssuer, 10, 10);
  }
  if (pay.originDomain) {
    slot("origin-row").hidden = false;
    slot("origin").textContent = pay.originDomain;
  }
  if (pay.callbackHost) {
    slot("callback-row").hidden = false;
    slot("callback").textContent = pay.callbackHost;
  }
  const web = new URL(root.dataset.walletWeb || "https://cosmospay.lat/wallet/");
  web.searchParams.set("uri", uri);
  slot<HTMLAnchorElement>("web-wallet").href = web.href;

  let attempted = false;
  async function payWithExtension() {
    if (attempted || !window.cosmosWallet) return;
    attempted = true;
    slot("status").textContent = t.paying;
    try {
      const res = (await window.cosmosWallet.requestPayment(uri)) as { hash?: string } | undefined;
      slot("status").textContent = `✓ ${t.success}`;
      slot("result").hidden = false;
      slot("result").textContent = `${t.hash}:\n${res && res.hash ? res.hash : JSON.stringify(res)}`;
    } catch (e) {
      attempted = false; // allow a retry
      slot("status").textContent = `✗ ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  let wired = false;
  function wireUp() {
    if (wired) return;
    wired = true;
    if (window.cosmosWallet) {
      action("pay-extension").hidden = false;
      action("pay-extension").addEventListener("click", () => void payWithExtension());
      slot("status").textContent = t.review;
    } else {
      slot("web-wallet").hidden = false;
      slot("status").textContent = t.noExt;
    }
  }
  window.addEventListener("cosmosWallet#initialized", wireUp, { once: true });
  window.setTimeout(wireUp, EXTENSION_WAIT_MS);
}
