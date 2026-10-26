/* The confidential-token SDK encodes contract arguments with Node's global `Buffer`
   (`Buffer.from` in its chain/payload.js: every register, transfer and withdraw), which browsers do
   not have, so creating a confidential account or paying privately failed with "Buffer is not
   defined". This puts the `buffer` package's implementation (the one stellar-base itself imports)
   on globalThis before the SDK is used. Imported first by src/lib/zk/wallet.ts. */
import { Buffer } from "buffer";

const scope = globalThis as unknown as { Buffer?: unknown };
if (typeof scope.Buffer === "undefined") scope.Buffer = Buffer;
