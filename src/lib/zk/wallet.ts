/* ZkWallet: one Stellar account's confidential balance on Cosmos Pay's confidential token, run
   entirely in the browser over the confidential-token SDK (OpenZeppelin's stellar-confidential
   0.8.0). Freighter signs every transaction; proofs are generated here with bb.js; the
   confidential key is derived from a Freighter signature and kept in sessionStorage only (it is
   re-derived in a new tab). Balances are rebuilt from chain events and checked against the
   on-chain commitments by the SDK's StateEngine.

   Used by the merchant's account page (register, balance, merge, withdraw) and the ZK checkout
   (`pay`: register if needed, fund the spendable balance, then the two confidential transfers of
   a ZK payment). */
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
  fromHex,
  proverFromArtifact,
  submitDeposit,
  submitMerge,
  submitRegister,
  submitTransfer,
  submitWithdraw,
  toHex32,
  type CircuitProver,
  type KeyPair,
  type Opening,
} from "stellar-confidential-token-sdk";
import { ensureBrowserBackend } from "@/lib/zk/bb-loader";
import { connectFreighter, type MessageSigner } from "@/lib/zk/freighter-signer";
import { deriveSignerRootSk } from "@/lib/zk/derive-key";

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
    private readonly signer: MessageSigner,
    private readonly keys: KeyPair,
    private readonly client: ChainClient,
    private readonly engine: StateEngine,
  ) {}

  /** Connect Freighter and derive (or reuse this tab's) confidential key for the token. */
  static async connect(deployment: ZkDeployment, onPhase?: (p: ZkPhase) => void): Promise<ZkWallet> {
    ensureBrowserBackend();
    const signer = await connectFreighter(deployment.networkPassphrase);
    const client = new ChainClient({
      rpcUrl: deployment.rpcUrl,
      networkPassphrase: deployment.networkPassphrase,
      contracts: { token: deployment.token.contractId, verifier: deployment.verifier, auditor: deployment.auditorRegistry },
    });
    const token = deployment.token.contractId;
    const addrF = addressToField(token);
    const onchain = await client.confidentialBalance(signer.publicKey);
    const matches = (k: KeyPair) => !onchain || onchain.spendingKey.equals(k.Y);
    // Kept for this tab only: closing it forgets the key, and the next visit derives it again.
    const cacheKey = `cosmospay:zk:sk:${token}:${signer.publicKey}`;
    let keys: KeyPair | null = null;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) keys = deriveKeys(fromHex(cached), addrF);
    } catch (e) { /* storage unavailable: derive again */ }
    if (keys && !matches(keys)) keys = null;
    if (!keys) {
      onPhase?.("keys");
      keys = deriveKeys(await deriveSignerRootSk(signer, token), addrF);
      if (!matches(keys)) {
        throw new Error("This account is registered on the token under a key this wallet does not derive, so it cannot be used here");
      }
      try { sessionStorage.setItem(cacheKey, toHex32(keys.sk)); } catch (e) { /* proceed without the cache */ }
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
    const r = await submitRegister(this.client, this.signer, this.address, this.deployment.auditorId, w, proof);
    return r.hash;
  }

  async deposit(units: bigint, onPhase?: (p: ZkPhase) => void): Promise<string> {
    onPhase?.("signing");
    return (await submitDeposit(this.client, this.signer, this.address, this.address, units)).hash;
  }

  async merge(onPhase?: (p: ZkPhase) => void): Promise<string> {
    onPhase?.("signing");
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
