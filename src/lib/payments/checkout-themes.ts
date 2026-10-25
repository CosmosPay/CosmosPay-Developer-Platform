/* checkout-themes.ts: the prebuilt designs a merchant picks for a payment link's hosted
   checkout. The community server stores the choice on the payment intent (`checkoutTheme`)
   with exactly these values; the dashboard offers them and the checkout page draws them. */

export const CHECKOUT_THEMES = ["classic", "split", "ticket", "card"] as const;
export type CheckoutTheme = (typeof CHECKOUT_THEMES)[number];
export const DEFAULT_CHECKOUT_THEME: CheckoutTheme = "classic";

export function isCheckoutTheme(value: unknown): value is CheckoutTheme {
  return typeof value === "string" && (CHECKOUT_THEMES as readonly string[]).includes(value);
}

/* The design-gallery thumbnail for each design (public/media/designs/). */
export function themeThumbnail(theme: CheckoutTheme): string {
  return `/media/designs/${theme}.svg`;
}
