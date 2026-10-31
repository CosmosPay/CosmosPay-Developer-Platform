/* Points the confidential-token SDK's prover at bb.js served as native ESM by this origin
   (src/pages/payments/zk/bb/ at `/zk/bb/`, on the payments and the platform domains, at the version
   the SDK pins, with the isolation headers its worker needs). bb.js starts its wasm
   worker relative to `import.meta.url`, so it must keep its own URL: imported through Vite it would
   land in a hashed chunk without its worker and proving would hang.

   The import goes through `new Function` so Vite never sees (or rewrites) it, and is built lazily:
   this module is never evaluated on the server, and only on a page that proves. */
import { setUltraHonkBackendLoader } from "stellar-confidential-token-sdk";
import { BB_BASE } from "@/lib/zk/bb-version";

const BB_URL = `${BB_BASE}/index.js`;

let nativeImport: ((url: string) => Promise<Record<string, unknown>>) | undefined;
let registered = false;

/** Register the browser bb.js loader once. */
export function ensureBrowserBackend(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;
  setUltraHonkBackendLoader(async () => {
    nativeImport ??= new Function("url", "return import(url)") as (url: string) => Promise<Record<string, unknown>>;
    const mod = await nativeImport(BB_URL);
    return mod.UltraHonkBackend as never;
  });
}

/** Whether this page can prove at all: bb.js needs WebAssembly. A cross-origin isolated page (the
    private checkout) proves on several threads; any other (the dashboard, or a browser that cannot
    isolate) proves on one, slower but the same proof. */
export function canProve(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly === "object";
}

/** Whether proving runs on several threads here (shared memory, so a cross-origin isolated page). */
export function provesInParallel(): boolean {
  return typeof window !== "undefined" && window.crossOriginIsolated === true && typeof SharedArrayBuffer !== "undefined";
}
