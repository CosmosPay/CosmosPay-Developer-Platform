/* pay-button.ts — <cosmos-pay-button link="LINK_ID">: a button that opens the hosted checkout
   for a payment link in a popup (no iframe: the payments pages refuse every frame).

   While its popup is open it listens for the checkout's status messages and re-fires them on
   itself as `cosmospay:status` / `cosmospay:paid` (src/embed/events.ts). Only a message from
   the payments origin, from the very window this element opened, in the exact shape and for
   the link it opened, gets through (readStatusMessage). With the popup blocked it navigates
   the tab to the checkout instead; then there is no opener to report back to, and the
   merchant learns the outcome where it always should: the webhook or the API.

   Attributes: `link` (required, the payment link id), `lang` (en/es/pt/fr/de; the button's
   label, and the checkout's language when set), `theme` (light/dark/auto). The element's own
   text, if any, replaces the label. */
import { readStatusMessage } from "@/lib/payments/embed-protocol";
import type { LinkStatus } from "@/lib/payments/payment-link";
import { PAYMENTS_ORIGIN } from "@/embed/config";
import { browserLanguages } from "@/embed/dom";
import { emitStatus } from "@/embed/events";
import { EMBED_MESSAGES } from "@/embed/i18n";
import { checkoutUrl, parseLinkId, parseTheme, popupFeatures, popupName, resolveLang, supportedLang } from "@/embed/options";
import { adoptStyles, BUTTON_CSS } from "@/embed/styles";

/* How often to check whether the payer closed the popup, to stop listening. */
const CLOSED_POLL_MS = 500;

export class CosmosPayButton extends HTMLElement {
  static observedAttributes = ["link", "lang", "theme"];

  private readonly button: HTMLButtonElement;
  private readonly label: HTMLSlotElement;
  private readonly description: HTMLSpanElement;
  private popup: Window | null = null;
  private trackedId: string | null = null;
  private lastStatus: LinkStatus | null = null;
  private closedTimer: number | undefined;
  private warnedFor: string | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    adoptStyles(shadow, BUTTON_CSS);

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "cp btn";
    this.button.setAttribute("part", "button");
    this.button.setAttribute("aria-describedby", "cp-new-window");
    // The element's own content, when it has any, is the label; this is the fallback.
    this.label = document.createElement("slot");
    this.button.append(this.label);

    // Read as the button's description ("opens in a new window"), never shown.
    this.description = document.createElement("span");
    this.description.id = "cp-new-window";
    this.description.hidden = true;

    shadow.append(this.button, this.description);
    this.button.addEventListener("click", this.onClick);
  }

  connectedCallback(): void {
    this.render();
  }

  disconnectedCallback(): void {
    // The popup stays open (the payer may be mid-payment); this element just stops listening.
    this.stopTracking();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render();
  }

  private render(): void {
    const lang = resolveLang(this.getAttribute("lang"), browserLanguages());
    const t = EMBED_MESSAGES[lang].button;
    this.button.dataset.theme = parseTheme(this.getAttribute("theme"));
    this.button.lang = lang;
    this.label.textContent = t.label;
    this.description.textContent = t.newWindow;

    const raw = this.getAttribute("link");
    if (parseLinkId(raw)) {
      this.button.removeAttribute("aria-disabled");
    } else {
      // Focusable but inert, so it can still be found and its state read out.
      this.button.setAttribute("aria-disabled", "true");
      if (this.warnedFor !== raw) {
        this.warnedFor = raw;
        console.warn('[cosmos-pay] <cosmos-pay-button> needs a "link" attribute with a payment link id.');
      }
    }
  }

  private onClick = (event: MouseEvent): void => {
    const id = parseLinkId(this.getAttribute("link"));
    if (!id) {
      event.preventDefault();
      return;
    }
    // A second click while the window is still open brings it back instead of opening another.
    if (this.popup && !this.popup.closed && this.trackedId === id) {
      this.popup.focus();
      return;
    }
    const url = checkoutUrl(PAYMENTS_ORIGIN, id, supportedLang(this.getAttribute("lang")));
    const popup = window.open(url, popupName(id), popupFeatures(window));
    if (!popup) {
      // Blocked: the same checkout in this tab.
      window.location.assign(url);
      return;
    }
    this.track(popup, id);
  };

  private track(popup: Window, id: string): void {
    this.stopTracking();
    this.popup = popup;
    this.trackedId = id;
    this.lastStatus = null;
    window.addEventListener("message", this.onMessage);
    this.closedTimer = window.setInterval(() => {
      if (popup.closed) this.stopTracking();
    }, CLOSED_POLL_MS);
  }

  private stopTracking(): void {
    window.removeEventListener("message", this.onMessage);
    window.clearInterval(this.closedTimer);
    this.popup = null;
    this.trackedId = null;
  }

  private onMessage = (event: MessageEvent): void => {
    if (!this.trackedId) return;
    const message = readStatusMessage(event, { origin: PAYMENTS_ORIGIN, source: this.popup, id: this.trackedId });
    // The checkout reports changes only, but a reload of the popup says the same thing again.
    if (!message || message.status === this.lastStatus) return;
    this.lastStatus = message.status;
    emitStatus(this, message.id, message.status);
  };
}
