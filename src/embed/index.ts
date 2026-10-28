/* index.ts: entry of public/embed/cosmos-pay.js (scripts/build-embed.mjs).

   A merchant adds one script tag and gets two elements:
     <cosmos-pay-button link="LINK_ID">   opens the hosted checkout in a popup
     <cosmos-pay-checkout link="LINK_ID"> draws a compact checkout inline
   Defining them twice throws, so a page that includes the script twice keeps the first. */
import { CosmosPayButton } from "@/embed/pay-button";
import { CosmosPayCheckout } from "@/embed/inline-checkout";

const ELEMENTS: [string, CustomElementConstructor][] = [
  ["cosmos-pay-button", CosmosPayButton],
  ["cosmos-pay-checkout", CosmosPayCheckout],
];

if (typeof window !== "undefined" && window.customElements) {
  for (const [name, element] of ELEMENTS) {
    if (!customElements.get(name)) customElements.define(name, element);
  }
}
