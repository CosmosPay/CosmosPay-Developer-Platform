/* Stands in for `@aztec/bb.js` in every Vite build (astro.config.mjs aliases it here). bb.js is
   served as native ESM by src/pages/payments/zk/bb/ and registered by src/lib/zk/bb-loader.ts; reaching
   this module means a prover ran before `ensureBrowserBackend()`. */
export const UltraHonkBackend = new Proxy(function UltraHonkBackend() {}, {
  construct() {
    throw new Error("bb.js is loaded from /zk/bb at runtime: call ensureBrowserBackend() before proving");
  },
});
