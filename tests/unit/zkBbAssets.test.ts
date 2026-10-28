import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BB_FILES, BB_VERSION, ZK_ISOLATION_HEADERS, bbAssetResponse } from "@/lib/zk/bb-assets";

/* The prover's files: the version the confidential-token SDK pins, the isolation headers bb.js's
   worker needs, and nothing outside its own folder. */

const pkg = (p: string) => JSON.parse(readFileSync(join(process.cwd(), "node_modules", ...p.split("/"), "package.json"), "utf8"));

test("the served bb.js is the version the SDK pins, and the installed one", () => {
  assert.equal(pkg("stellar-confidential-token-sdk").dependencies["@aztec/bb.js"], BB_VERSION);
  assert.equal(pkg("@aztec/bb.js").version, BB_VERSION);
});

test("a bb.js file carries the isolation headers and an immutable cache", async () => {
  const res = await bbAssetResponse(BB_VERSION, "main.worker.js");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cross-Origin-Embedder-Policy"), ZK_ISOLATION_HEADERS["Cross-Origin-Embedder-Policy"]);
  assert.equal(res.headers.get("Cross-Origin-Opener-Policy"), "same-origin");
  assert.equal(res.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.match(res.headers.get("Cache-Control") ?? "", /immutable/);
  assert.match(res.headers.get("Content-Type") ?? "", /javascript/);
});

test("only the listed files of the pinned version are served", async () => {
  assert.ok(BB_FILES.includes("index.js"));
  for (const [version, file] of [["0.86.0", "index.js"], [BB_VERSION, "package.json"], [BB_VERSION, "../package.json"], [BB_VERSION, "index.js.LICENSE.txt"], [undefined, "index.js"]] as const) {
    assert.equal((await bbAssetResponse(version, file)).status, 404, `${version}/${file}`);
  }
});
