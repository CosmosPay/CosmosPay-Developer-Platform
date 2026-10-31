/* ZkWallet: one Stellar account's confidential balance on Cosmos Pay's confidential token, run
   entirely in the browser over the confidential-token SDK (OpenZeppelin's stellar-confidential
   0.8.0). A signer signs every transaction: Freighter on the private checkout, the person's own
   wallet through a signed XDR in the private accounts table (src/lib/zk/xdr-signer.ts). Proofs are
   generated here with bb.js; the confidential key is derived from a signature (a SEP-53 message or
   the key transaction, src/lib/zk/derive-key.ts) on every connect and kept in this object only,
   never stored. Balances are rebuilt from chain events and checked against the
   on-chain commitments by the SDK's StateEngine.

   Used by the private payments panel (register, balances, merge, withdraw) and the private checkout
   (`pay`: register if needed, fund the spendable balance, then the two confidential transfers of
   a ZK payment). */
// First: the SDK needs a global Buffer in the browser (src/lib/zk/buffer-global.ts).
import "@/lib/zk/buffer-global";
import {
  ChainClient,
  LocalStorageStore,
  StateEngine,
  StateDivergedError,
  addressToField,
  buildRegisterWitness,
  buildTransferWitness,
  buildWithdrawWitness,
  deriveKeys,
  proverFromArtifact,
  submitDeposit,
  submitMerge,
  submitRegister,
  submitTransfer,
  submitWithdraw,
  type CircuitProver,
  type KeyPair,
  type Opening,
} from "stellar-confidential-token-sdk";
import { Address, Keypair, nativeToScVal, rpc, xdr } from "@stellar/stellar-sdk";
import { ensureBrowserBackend } from "@/lib/zk/bb-loader";
import { deriveSignerRootSk, deriveTransactionRootSk, type TransactionSigner } from "@/lib/zk/derive-key";
import type { SignPurpose } from "@/lib/zk/xdr-signer";

/** What the Payments API says about the confidential token (`GET /v1/zk-payments/config`). */
export interface ZkDeployment {
  network: string;
  rpcUrl: string;
  networkPassphrase: string;
  token: { contractId: string; symbol: string; decimals: number; deployedAtLedger: number };
  verifier: string;
  auditorRegistry: string;
  auditorId: number;
}

export type ZkPhase = "keys" | "proving" | "signing" | "waiting";

type CircuitName = "register" | "transfer" | "withdraw";

/* The circuits are large (their bytecode), so each loads when it is first needed. */
const CIRCUITS: Record<CircuitName, () => Promise<{ default: unknown }>> = {
  register: () => import("stellar-confidential-token-sdk/circuits/register.json"),
  transfer: () => import("stellar-confidential-token-sdk/circuits/transfer.json"),
  withdraw: () => import("stellar-confidential-token-sdk/circuits/withdraw.json"),
};

/** Signs the account's transactions; a message signer can also give the SEP-53 key root. */
export type ZkSigner = TransactionSigner & { signMessage?: (message: string) => Promise<Uint8Array> };

/** Where the confidential key comes from, tried in order: a new account takes the first. */
export type KeyRoot = "message" | "transaction";

/** The account is registered under a key none of the given roots derives. */
export class KeyMismatchError extends Error {}

/** Removes every confidential key an earlier version of this page left in sessionStorage. */
function forgetStoredKeys(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("cosmospay:zk:sk:")) sessionStorage.removeItem(key);
    }
  } catch (e) { /* storage unavailable: nothing was kept there */ }
}

export interface ZkBalances {
  registered: boolean;
  spendable: bigint;
  receiving: bigint;
}

export class ZkWallet {
  private provers = new Map<CircuitName, CircuitProver>();

  private constructor(
    readonly address: string,
    readonly deployment: ZkDeployment,
    private readonly signer: ZkSigner,
    private readonly keys: KeyPair,
    private readonly client: ChainClient,
    private readonly engine: StateEngine,
  ) {}

  /**
   * Derive (or reuse this tab's) confidential key for the token from `signer`'s signature, one root
   * after another until one matches the key the account was registered under.
   */
  static async connect(deployment: ZkDeployment, signer: ZkSigner, onPhase?: (p: ZkPhase) => void, roots: KeyRoot[] = ["transaction", "message"]): Promise<ZkWallet> {
    ensureBrowserBackend();
    const client = new ChainClient({
      rpcUrl: deployment.rpcUrl,
      networkPassphrase: deployment.networkPassphrase,
      contracts: { token: deployment.token.contractId, verifier: deployment.verifier, auditor: deployment.auditorRegistry },
    });
    const token = deployment.token.contractId;
    const addrF = addressToField(token);
    const onchain = await client.confidentialBalance(signer.publicKey);
    const matches = (k: KeyPair) => !onchain || onchain.spendingKey.equals(k.Y);
    // The key is derived from the account's signature on every connect and lives in this object
    // only (product owner, 2026-10-27: deriving the private account always asks for the
    // signature). It used to be kept in sessionStorage, which let a reload reuse a customer's key
    // without the customer: any key a page stored that way is removed here.
    forgetStoredKeys();
    let keys: KeyPair | null = null;
    onPhase?.("keys");
    for (const root of roots) {
      if (root === "message" && !signer.signMessage) continue;
      const sk = root === "message"
        ? await deriveSignerRootSk(signer as ZkSigner & { signMessage: (m: string) => Promise<Uint8Array> }, token)
        : await deriveTransactionRootSk(signer, token, deployment.networkPassphrase);
      const candidate = deriveKeys(sk, addrF);
      if (matches(candidate)) { keys = candidate; break; }
    }
    if (!keys) {
      throw new KeyMismatchError("This account is registered on the token under a key these signatures do not derive, so it cannot be used here");
    }
    const engine = new StateEngine({
      client,
      store: new LocalStorageStore(`cosmospay:zk:state:${token}:`),
      keys,
      address: signer.publicKey,
      fromLedger: deployment.token.deployedAtLedger,
    });
    return new ZkWallet(signer.publicKey, deployment, signer, keys, client, engine);
  }

  /** Tells the signer what its next signature is for. */
  private ready(purpose: SignPurpose): void {
    this.signer.prepare?.(purpose);
  }

  private async prover(name: CircuitName): Promise<CircuitProver> {
    let p = this.provers.get(name);
    if (!p) {
      const circuit = (await CIRCUITS[name]()).default;
      p = proverFromArtifact(circuit as never);
      this.provers.set(name, p);
    }
    return p;
  }

  /** Whether `address` holds a confidential account on the token. */
  async isRegistered(address = this.address): Promise<boolean> {
    return (await this.client.confidentialBalance(address)) !== null;
  }

  /** The account's balances, rebuilt from events and checked against the chain. */
  async balances(): Promise<ZkBalances> {
    if (!(await this.isRegistered())) return { registered: false, spendable: 0n, receiving: 0n };
    const s = await this.engine.sync();
    return { registered: true, spendable: s.spendable.v, receiving: s.receiving.v };
  }

  /** Bind the account's confidential keys to the token (a register proof, then one signature). */
  async register(onPhase?: (p: ZkPhase) => void): Promise<string> {
    const w = buildRegisterWitness(this.keys, this.address);
    onPhase?.("proving");
    const { proof } = await (await this.prover("register")).prove(w.inputs);
    onPhase?.("signing");
    this.ready("register");
    const r = await submitRegister(this.client, this.signer, this.address, this.deployment.auditorId, w, proof);
    return r.hash;
  }

  async deposit(units: bigint, onPhase?: (p: ZkPhase) => void): Promise<string> {
    onPhase?.("signing");
    this.ready("deposit");
    return (await submitDeposit(this.client, this.signer, this.address, this.address, units)).hash;
  }

  async merge(onPhase?: (p: ZkPhase) => void): Promise<string> {
    onPhase?.("signing");
    this.ready("merge");
    return (await submitMerge(this.client, this.signer, this.address)).hash;
  }

  /** Sync, then the spendable opening to prove from, re-checked against the chain. */
  private async spendableForProof(): Promise<Opening> {
    try {
      await this.engine.sync();
    } catch (e) {
      // A receiving-side divergence does not block a transfer or a withdraw (they open C_spend only).
      if (!(e instanceof StateDivergedError && e.report.spendableOk)) throw e;
    }
    return this.engine.spendableForProof();
  }

  /** A confidential transfer of `units` to a registered account; returns the transaction hash. */
  async transfer(to: string, units: bigint, onPhase?: (p: ZkPhase) => void): Promise<string> {
    const recipient = await this.client.confidentialBalance(to);
    if (!recipient) throw new Error("The recipient has no confidential account on this token");
    const kAudR = await this.client.auditorKey(recipient.auditorId);
    const kAudS = await this.client.auditorKey(this.deployment.auditorId);
    const { v, r } = await this.spendableForProof();
    if (v < units) throw new Error("Not enough confidential balance");
    const w = buildTransferWitness({ keys: this.keys, v, r, amount: units, pvkB: recipient.viewingPublicKey, kAudR, kAudS });
    onPhase?.("proving");
    const { proof } = await (await this.prover("transfer")).prove(w.inputs);
    onPhase?.("signing");
    this.ready("transfer");
    const res = await submitTransfer(this.client, this.signer, this.address, to, w, proof);
    await this.engine.setSpendable(w.next);
    return res.hash;
  }

  /** Move `units` of the confidential balance back to the account's public XLM. */
  async withdraw(units: bigint, onPhase?: (p: ZkPhase) => void): Promise<string> {
    const kAudS = await this.client.auditorKey(this.deployment.auditorId);
    const { v, r } = await this.spendableForProof();
    if (v < units) throw new Error("Not enough confidential balance");
    const w = buildWithdrawWitness({ keys: this.keys, v, r, amount: units, kAudS });
    onPhase?.("proving");
    const { proof } = await (await this.prover("withdraw")).prove(w.inputs);
    onPhase?.("signing");
    this.ready("withdraw");
    const res = await submitWithdraw(this.client, this.signer, this.address, this.address, units, w, proof);
    await this.engine.setSpendable(w.next);
    return res.hash;
  }

  /**
   * Make the spendable balance cover `units`: merge what is waiting in the receiving balance and,
   * if that is still short, deposit the difference from public XLM and merge again.
   */
  async fund(units: bigint, onPhase?: (p: ZkPhase) => void): Promise<void> {
    let b = await this.balances();
    if (b.spendable >= units) return;
    if (b.receiving > 0n) {
      await this.merge(onPhase);
      b = await this.balances();
      if (b.spendable >= units) return;
    }
    await this.deposit(units - b.spendable, onPhase);
    await this.merge(onPhase);
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.provers.values()].map((p) => p.destroy()));
    this.provers.clear();
  }
}

/**
 * Which of `addresses` hold a confidential account on the token: a read of the chain, with no
 * wallet, key or signature. True or false per address; null where the read failed.
 */
export async function confidentialAccounts(deployment: ZkDeployment, addresses: readonly string[]): Promise<Record<string, boolean | null>> {
  const client = new ChainClient({
    rpcUrl: deployment.rpcUrl,
    networkPassphrase: deployment.networkPassphrase,
    contracts: { token: deployment.token.contractId, verifier: deployment.verifier, auditor: deployment.auditorRegistry },
  });
  const out: Record<string, boolean | null> = {};
  await Promise.all(addresses.map(async (a) => {
    out[a] = await client.confidentialBalance(a).then((b) => b !== null, () => null);
  }));
  return out;
}

/**
 * Whether `address` exists on the network: a register is the account's own transaction, so an
 * account that was never funded cannot get a confidential account. A read, with no signature.
 */
export async function accountExists(deployment: ZkDeployment, address: string): Promise<boolean> {
  // The ledger entry itself, not rpc.Server.getAccount: that one says "not found" for any failure,
  // an unreachable RPC too, which must not read as an account that does not exist.
  const server = new rpc.Server(deployment.rpcUrl, { allowHttp: deployment.rpcUrl.startsWith("http://") });
  const key = xdr.LedgerKey.account(new xdr.LedgerKeyAccount({ accountId: Keypair.fromPublicKey(address).xdrPublicKey() }));
  const { entries } = await server.getLedgerEntries(key);
  return entries.length > 0;
}

/**
 * When, and in which transaction, `address` registered its confidential account on the token: the
 * token's `register` event naming it. Null when the RPC no longer keeps that ledger (it keeps a
 * window of recent ones) or the account never registered. A read, with no signature.
 */
export async function registrationOf(deployment: ZkDeployment, address: string): Promise<{ txHash: string; at: string } | null> {
  const server = new rpc.Server(deployment.rpcUrl, { allowHttp: deployment.rpcUrl.startsWith("http://") });
  const topics = [[nativeToScVal("register", { type: "symbol" }).toXDR("base64"), new Address(address).toScVal().toXDR("base64")]];
  const filters: rpc.Api.EventFilter[] = [{ type: "contract", contractIds: [deployment.token.contractId], topics }];
  let start = deployment.token.deployedAtLedger;
  let cursor: string | undefined;
  // Each answer covers a range of ledgers: page on until the event or the latest ledger.
  for (let i = 0; i < 40; i++) {
    let res: rpc.Api.GetEventsResponse;
    try {
      res = await server.getEvents(cursor ? { filters, cursor, limit: 10 } : { filters, startLedger: start, limit: 10 });
    } catch (e) {
      // A start older than the RPC's window: from the oldest ledger it keeps.
      const oldest = /between (\d+) and \d+/.exec(e instanceof Error ? e.message : String(e));
      if (!cursor && oldest && Number(oldest[1]) > start) { start = Number(oldest[1]); continue; }
      throw e;
    }
    const ev = res.events[0];
    if (ev) return { txHash: ev.txHash, at: ev.ledgerClosedAt };
    if (!res.cursor || res.cursor === cursor) return null;
    cursor = res.cursor;
  }
  return null;
}

/**
 * Proves a register circuit for throwaway keys, with no wallet, network or signature: the whole
 * browser proving path (bb.js and its worker, noir's wasm, the circuit) in one call. Used by the
 * development build's self-test in the private payments view; returns the proof's size and the time taken.
 */
export async function selfTestProver(tokenContract: string, account: string): Promise<{ bytes: number; ms: number }> {
  ensureBrowserBackend();
  const { generateKeys } = await import("stellar-confidential-token-sdk");
  const keys = generateKeys(addressToField(tokenContract));
  const w = buildRegisterWitness(keys, account);
  const circuit = (await CIRCUITS.register()).default;
  const prover = proverFromArtifact(circuit as never);
  const started = performance.now();
  try {
    const { proof } = await prover.prove(w.inputs);
    return { bytes: proof.length, ms: Math.round(performance.now() - started) };
  } finally {
    await prover.destroy();
  }
}
