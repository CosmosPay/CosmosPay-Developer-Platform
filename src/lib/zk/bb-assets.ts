/* Serves bb.js's browser bundle to the ZK payment pages (server-only; the route is
   src/pages/payments/zk/bb/[version]/[file].ts on the payments domain).

   Why a route and not public/: bb.js starts a dedicated Web Worker from `main.worker.js`, and in
   a cross-origin isolated page that worker only loads when its own script response carries the
   isolation headers too. Static files skip the middleware and cannot carry them; this route sets
   them on every file. The files are read from node_modules, at exactly the version the
   confidential-token SDK pins (the verification keys registered on-chain were produced with that
   prover), under a versioned path so they can be cached forever. */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { BB_VERSION } from "@/lib/zk/bb-version";

export { BB_VERSION };

/* Every file of `dest/browser` a page can ask for; nothing else under node_modules is served. */
export const BB_FILES = ["index.js", "main.worker.js", "thread.worker.js", "barretenberg.js", "barretenberg-threads.js"] as const;

/* The headers of a cross-origin isolated page (COOP + COEP). `credentialless` rather than
   `require-corp`: cross-origin requests without credentials still load (the RPC, the gateway,
   an avatar), while the page gets SharedArrayBuffer and bb.js proves on several threads. Chrome,
   Edge and Firefox support it; a browser that does not stays unisolated and proves on one thread,
   as the dashboard does (src/lib/zk/bb-loader.ts). */
export const ZK_ISOLATION_HEADERS: Record<string, string> = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

const bbDir = () => join(process.cwd(), "node_modules", "@aztec", "bb.js", "dest", "browser");

/* The installed bb.js, refused when it is not the pinned one (a proof from any other version
   does not verify on-chain). Read once. */
let installed: string | null | undefined;
function installedVersion(): string | null {
  if (installed === undefined) {
    try {
      installed = JSON.parse(readFileSync(join(process.cwd(), "node_modules", "@aztec", "bb.js", "package.json"), "utf8")).version;
    } catch {
      installed = null;
    }
  }
  return installed ?? null;
}

const cache = new Map<string, Buffer>();

/** The response for `/zk/bb/{version}/{file}`: the file with the isolation headers, or 404. */
export async function bbAssetResponse(version: string | undefined, file: string | undefined): Promise<Response> {
  if (version !== BB_VERSION || !file || !(BB_FILES as readonly string[]).includes(file)) {
    return new Response("Not found", { status: 404 });
  }
  if (installedVersion() !== BB_VERSION) {
    console.error(`[zk] bb.js ${installedVersion() ?? "(missing)"} is installed, but the ZK pages need ${BB_VERSION}`);
    return new Response("Prover unavailable", { status: 503 });
  }
  let body = cache.get(file);
  if (!body) {
    body = await readFile(join(bbDir(), file));
    cache.set(file, body);
  }
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "same-origin",
      ...ZK_ISOLATION_HEADERS,
    },
  });
}
