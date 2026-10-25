/* The bb.js version the confidential-token SDK pins (stellar-confidential-token-sdk's
   `@aztec/bb.js`): the verification keys registered on-chain were produced with that prover, so a
   proof from any other version does not verify. Shared by the server route that serves bb.js and
   the browser loader; tests/unit/zkBbAssets.test.ts checks it against the SDK. */
export const BB_VERSION = "0.87.0";

/* Where the payments domain serves it (src/pages/payments/zk/bb/[version]/[file].ts). */
export const BB_BASE = `/zk/bb/${BB_VERSION}`;
