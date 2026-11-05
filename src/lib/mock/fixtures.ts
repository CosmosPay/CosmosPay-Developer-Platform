/* Building blocks for the mock data: a seeded random source (the same rows on every start), ids,
   dates relative to the moment the store is seeded, and addresses, hashes and keys in each chain's
   real format (valid Stellar StrKeys, base58 Solana keys, EVM hex), so every AddressLink, explorer
   link and shape check in the views treats them as real ones. Nothing here is a real account. */
import { createHash } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import { StrKey } from "@stellar/stellar-sdk";
import type { MockEnv } from "@/lib/mock/http";

/* --- Seeded randomness (mulberry32) --- */

export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [min, max]. */
  int(min: number, max: number): number;
  /** An amount in [min, max] with `decimals` places, as a string ("420.50"). */
  amount(min: number, max: number, decimals?: number): string;
  pick<T>(items: readonly T[]): T;
  /** true with probability p. */
  chance(p: number): boolean;
}

export function rng(seed: string): Rng {
  let a = parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    amount: (min, max, decimals = 2) => (min + next() * (max - min)).toFixed(decimals),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  };
}

/* --- Bytes from a label --- */

function bytes(label: string, length = 32): Buffer {
  const out: Buffer[] = [];
  let i = 0;
  while (out.reduce((n, b) => n + b.length, 0) < length) {
    out.push(createHash("sha256").update(`cosmos-mock:${label}:${i++}`).digest());
  }
  return Buffer.concat(out).subarray(0, length);
}

export function hex(label: string, length = 32): string {
  return bytes(label, length).toString("hex");
}

/* --- Ids --- */

/** A UUID-shaped id (what the Payments API and Prisma's uuid() hand out). */
export function uuid(label: string): string {
  const h = hex(`uuid:${label}`, 16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** A cuid-shaped id (Prisma's cuid(), the platform's own tables). */
export function cuid(label: string): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const b = bytes(`cuid:${label}`, 24);
  return "c" + Array.from(b, (x) => alphabet[x % alphabet.length]).join("");
}

/* --- Chain formats --- */

/** A valid Stellar account id (G...). */
export function stellarAccount(label: string): string {
  return StrKey.encodeEd25519PublicKey(bytes(`stellar:${label}`));
}

/** A valid Soroban contract id (C...). */
export function stellarContract(label: string): string {
  return StrKey.encodeContract(bytes(`contract:${label}`));
}

/** A transaction hash (64 hex), Stellar's and NEAR's shape; EVM chains prefix it with 0x. */
export function txHash(label: string): string {
  return hex(`tx:${label}`);
}

export function evmAddress(label: string): string {
  return `0x${hex(`evm:${label}`, 20)}`;
}

export function evmTxHash(label: string): string {
  return `0x${hex(`evmtx:${label}`)}`;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58(input: Uint8Array): string {
  let n = BigInt(`0x${Buffer.from(input).toString("hex") || "0"}`);
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const byte of input) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

/** A Solana public key (32 bytes, base58). */
export function solanaAddress(label: string): string {
  return base58(bytes(`sol:${label}`));
}

/** A Solana transaction signature (64 bytes, base58). */
export function solanaSignature(label: string): string {
  return base58(bytes(`solsig:${label}`, 64));
}

/* --- Time --- */

const BOOT = Date.now();

/** An ISO date `hours` before the moment the mock started (fractions allowed). */
export function hoursAgo(hours: number): string {
  return new Date(BOOT - hours * 3_600_000).toISOString();
}

export function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}

/** An ISO date `hours` after the moment the mock started. */
export function hoursFromNow(hours: number): string {
  return new Date(BOOT + hours * 3_600_000).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/* --- Networks --- */

/** The Stellar network the Payments API names for an environment. */
export function stellarNetwork(env: MockEnv): "testnet" | "public" {
  return env === "prod" ? "public" : "testnet";
}

/** The USDC issuer on each Stellar network (Circle's). */
export const USDC_ISSUER: Record<MockEnv, string> = {
  dev: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  prod: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
};

/** EURC on mainnet (Circle's); the sandbox uses Circle's testnet issuer. */
export const EURC_ISSUER: Record<MockEnv, string> = {
  dev: "GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO",
  prod: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
};

/* --- Sample people and businesses (sample data, never translated) --- */

export const COMPANIES = [
  "Acme Inc.", "Lumio LLC", "Quanta", "Helios Co.", "Vertexa", "Novex", "Riverstone", "Cobalt",
  "Northwind", "Andes Coffee", "Salta Textiles", "Puna Labs", "Cafayate Wines", "Iguazu Travel",
  "Pampa Foods", "Patagonia Gear",
] as const;

export const PEOPLE = [
  "Lucía Fernández", "Mateo Gómez", "Valentina Ruiz", "Santiago López", "Camila Díaz",
  "Benjamín Torres", "Martina Romero", "Joaquín Herrera", "Sofía Castro", "Tomás Medina",
] as const;

/** An email for a sample business or person. */
export function emailFor(name: string, local = "billing"): string {
  const domain = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
  return `${local}@${domain || "example"}.com`;
}

/** A 1x1 transparent PNG, for the fields that carry an image. */
export const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/* A grayscale PNG from a grid of dark cells, each `scale` pixels wide. */
function png(cells: boolean[][], scale: number): Buffer {
  const side = cells.length * scale;
  const raw = Buffer.alloc((side + 1) * side, 255);
  for (let y = 0; y < side; y++) {
    raw[y * (side + 1)] = 0; // filter: none
    const row = cells[Math.floor(y / scale)];
    for (let x = 0; x < side; x++) if (row[Math.floor(x / scale)]) raw[y * (side + 1) + 1 + x] = 0x13;
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(side, 0);
  ihdr.writeUInt32BE(side, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const QR_CACHE = new Map<string, string>();

/** An image that looks like a QR code (finder squares and modules) for a `qr` field: a PNG data
    URL, as the Payments API answers (the hosted checkout refuses any other format). It encodes
    nothing: a mock payment cannot be scanned and paid. */
export function qrImage(label: string): string {
  const cached = QR_CACHE.get(label);
  if (cached) return cached;
  const n = 29;
  const quiet = 2;
  const r = rng(`qr:${label}`);
  const inFinder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const finderOn = (x: number, y: number) => {
    const fx = x >= n - 7 ? x - (n - 7) : x;
    const fy = y >= n - 7 ? y - (n - 7) : y;
    return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
  };
  const cells = Array.from({ length: n + quiet * 2 }, (_, y) =>
    Array.from({ length: n + quiet * 2 }, (_, x) => {
      const mx = x - quiet;
      const my = y - quiet;
      if (mx < 0 || my < 0 || mx >= n || my >= n) return false;
      return inFinder(mx, my) ? finderOn(mx, my) : r.chance(0.48);
    }),
  );
  const url = `data:image/png;base64,${png(cells, 6).toString("base64")}`;
  QR_CACHE.set(label, url);
  return url;
}
