/* integration-demos.ts: the demos of the integration options (sections/Integrations.astro),
   started by startLanding() on every page that has them. Each part looks for its own elements.

   Every demo is a sample: the embed's elements run in their `demo` mode (no request), the hosted
   checkout opens its design preview, and the payment link and API demos only draw on this page
   (src/lib/payments/integration-demo.ts has their data). Text is written with textContent and
   code as highlighted spans, never HTML. Anything that changes because the visitor acted is
   announced once through a status region; nothing changes on its own. */
import {
  demoAmountLabel,
  demoCheckoutAddress,
  demoRequest,
  demoResponse,
  demoWebhook,
  isDemoAsset,
  parseDemoAmount,
  type DemoInput,
} from "@/lib/payments/integration-demo";
import { highlightLines, type CodeLang } from "@/lib/payments/highlight";

export function startIntegrationDemos(): void {
  followTheme();
  logEmbedEvents();
  for (const root of document.querySelectorAll<HTMLElement>("[data-hosted-demo]")) hostedDemo(root);
  for (const root of document.querySelectorAll<HTMLElement>("[data-links-demo]")) linksDemo(root);
  for (const root of document.querySelectorAll<HTMLElement>("[data-api-demo]")) apiDemo(root);
}

/* The embed's elements follow the page's theme. */
function followTheme(): void {
  const apply = () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    for (const el of document.querySelectorAll("[data-demo-theme]")) el.setAttribute("theme", theme);
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

/* The embedded checkout's events, newest first, as a merchant's page would receive them. The
   list starts with the PENDING the element fired before this script ran (rendered by the page). */
const LOG_LENGTH = 4;
function logEmbedEvents(): void {
  for (const demo of document.querySelectorAll<HTMLElement>("[data-demo-events]")) {
    const list = demo.parentElement?.querySelector<HTMLOListElement>("[data-demo-log]");
    if (!list) continue;
    const log = (event: Event) => {
      const { status } = (event as CustomEvent<{ status: string }>).detail;
      const item = document.createElement("li");
      const name = document.createElement("code");
      name.translate = false;
      name.textContent = event.type;
      const value = document.createElement("span");
      value.textContent = status;
      item.append(name, value);
      list.prepend(item);
      while (list.children.length > LOG_LENGTH) list.lastElementChild?.remove();
    };
    // a confirmed payment fires both, status first
    demo.addEventListener("cosmospay:status", log);
    demo.addEventListener("cosmospay:paid", log);
  }
}

/* Hosted checkout: the chosen design's picture, description and sample page. */
function hostedDemo(root: HTMLElement): void {
  const shot = root.querySelector<HTMLImageElement>("[data-hosted-shot]");
  const desc = root.querySelector<HTMLElement>("[data-hosted-desc]");
  const open = root.querySelector<HTMLAnchorElement>("[data-hosted-open]");
  const legend = root.querySelector("legend")?.textContent ?? "";
  if (!shot || !desc || !open) return;
  root.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.type !== "radio" || !input.checked) return;
    const { thumb, preview, name, desc: text } = input.dataset;
    if (!thumb || !preview) return;
    shot.src = thumb;
    shot.alt = `${legend}: ${name ?? ""}`;
    desc.textContent = text ?? "";
    open.href = preview;
    // the picture fades in again, as a new screen would
    shot.classList.remove("is-new");
    void shot.offsetWidth;
    shot.classList.add("is-new");
  });
}

/* Reads a demo form's amount field, marking it and naming the problem when it is not one. */
function readAmount(input: HTMLInputElement, error: HTMLElement | null, describedBy: string): { ok: true; amount: string | null } | { ok: false } {
  const result = parseDemoAmount(input.value);
  input.setAttribute("aria-invalid", String(!result.ok));
  if (error) {
    error.hidden = result.ok;
    input.setAttribute("aria-describedby", [describedBy, result.ok ? "" : error.id].filter(Boolean).join(" "));
  }
  return result;
}

/* Payment link: the form builds the link, and the checkout beside it shows what the payer sees. */
function linksDemo(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>("[data-links-form]");
  const result = root.querySelector<HTMLElement>("[data-links-result]");
  const amountOut = root.querySelector<HTMLElement>("[data-links-amount]");
  const anyHint = root.querySelector<HTMLElement>("[data-links-any]");
  const msgOut = root.querySelector<HTMLElement>("[data-links-msg]");
  const status = root.querySelector<HTMLElement>("[data-links-status]");
  if (!form || !result || !amountOut || !anyHint || !msgOut || !status) return;
  const amountIn = form.elements.namedItem("amount") as HTMLInputElement;
  const assetIn = form.elements.namedItem("asset") as HTMLSelectElement;
  const msgIn = form.elements.namedItem("msg") as HTMLInputElement;
  const error = form.querySelector<HTMLElement>(".pl-field-error");
  const hintId = amountIn.getAttribute("aria-describedby") ?? "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = readAmount(amountIn, error, hintId);
    if (!amount.ok) {
      amountIn.focus();
      return;
    }
    const asset = isDemoAsset(assetIn.value) ? assetIn.value : "USDC";
    amountOut.textContent = amount.amount ? demoAmountLabel(amount.amount, asset) : amountOut.dataset.any ?? "";
    anyHint.hidden = amount.amount !== null;
    const msg = msgIn.value.trim();
    msgOut.textContent = msg;
    msgOut.hidden = !msg;
    result.classList.remove("is-new");
    void result.offsetWidth;
    result.classList.add("is-new");
    // Say it again even when the same text is already there.
    status.textContent = "";
    window.setTimeout(() => { status.textContent = root.dataset.created ?? ""; }, 60);
  });
}

/* API: a console that plays the three messages of a payment, one per press of its button:
   the request and the API's answer, then the webhook once the (simulated) payment confirms,
   then back to the start. */
type ApiStep = "idle" | "sent" | "paid";
function apiDemo(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>("[data-api-form]");
  const run = root.querySelector<HTMLButtonElement>("[data-api-run]");
  const consoleBox = root.querySelector<HTMLElement>("[data-api-console]");
  const idle = root.querySelector<HTMLElement>("[data-api-idle]");
  const list = root.querySelector<HTMLOListElement>("[data-api-list]");
  const status = root.querySelector<HTMLElement>("[data-api-status]");
  if (!form || !run || !consoleBox || !idle || !list || !status) return;
  const amountIn = form.elements.namedItem("amount") as HTMLInputElement;
  const assetIn = form.elements.namedItem("asset") as HTMLSelectElement;
  const error = form.querySelector<HTMLElement>(".pl-field-error");
  const copy = root.dataset;
  const origin = copy.origin ?? location.origin;
  let step: ApiStep = "idle";
  let input: DemoInput | null = null;

  const say = (text: string) => {
    status.textContent = "";
    window.setTimeout(() => { status.textContent = text; }, 60);
  };
  const setStep = (next: ApiStep) => {
    step = next;
    run.textContent = next === "idle" ? copy.send ?? "" : next === "sent" ? copy.simulate ?? "" : copy.restart ?? "";
    // The request's fields can change only before it is sent.
    amountIn.readOnly = next !== "idle";
    assetIn.disabled = next !== "idle";
  };
  const add = (label: string, line: string, value: unknown, after?: string) => {
    list.append(entry(label, line, value, after));
    idle.hidden = true;
    const last = list.lastElementChild as HTMLElement;
    consoleBox.scrollTo({ top: last.offsetTop - consoleBox.offsetTop - 12, behavior: "smooth" });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (step === "idle") {
      const amount = readAmount(amountIn, error, "");
      if (!amount.ok) {
        amountIn.focus();
        return;
      }
      input = { amount: amount.amount, asset: isDemoAsset(assetIn.value) ? assetIn.value : "USDC", msg: "Order #1001" };
      const now = new Date();
      add(copy.request ?? "", "POST /v1/payment-intents/pay", demoRequest(input));
      add(copy.response ?? "", "201 Created", demoResponse(input, now), `${copy.checkout}: ${demoCheckoutAddress(origin)}`);
      setStep("sent");
      say(copy.sent ?? "");
    } else if (step === "sent" && input) {
      add(copy.webhook ?? "", "POST /webhooks", demoWebhook(input, new Date()), "200 OK");
      setStep("paid");
      say(copy.paid ?? "");
    } else {
      list.replaceChildren();
      idle.hidden = false;
      input = null;
      setStep("idle");
      amountIn.focus();
    }
  });
}

/* One console entry: what it is, the request or status line, and the JSON. */
function entry(label: string, line: string, value: unknown, after?: string): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "pl-dm-entry";
  const head = document.createElement("p");
  head.className = "pl-dm-entry-head";
  const name = document.createElement("span");
  name.textContent = label;
  const code = document.createElement("code");
  code.translate = false;
  code.textContent = line;
  head.append(name, code);
  item.append(head, codeBlock(JSON.stringify(value, null, 2), "json"));
  if (after) {
    const foot = document.createElement("p");
    foot.className = "pl-dm-entry-foot";
    foot.translate = false;
    foot.textContent = after;
    item.append(foot);
  }
  return item;
}

/* The same markup Code.astro renders, built from highlight.ts's tokens. */
function codeBlock(src: string, lang: CodeLang): HTMLPreElement {
  const pre = document.createElement("pre");
  pre.className = "pl-codeblock";
  pre.translate = false;
  const code = document.createElement("code");
  for (const tokens of highlightLines(src, lang)) {
    const line = document.createElement("span");
    line.className = "pl-line";
    if (!tokens.length) line.textContent = " ";
    for (const token of tokens) {
      const span = document.createElement("span");
      span.className = `tk-${token.kind}`;
      span.textContent = token.text;
      line.append(span);
    }
    code.append(line);
  }
  pre.append(code);
  return pre;
}
