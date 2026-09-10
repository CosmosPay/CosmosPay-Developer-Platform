/* stellarVerify.test.ts — the wallet proves control of its Stellar account by signing a
   challenge, and this module is the only thing standing between that claim and an
   account being provisioned. It is hand-rolled (no @stellar/stellar-sdk on the
   dashboard), so both halves are asserted: the StrKey decode and the ed25519 verify.

   The `G…` addresses used here are BUILT in this file from a freshly generated key,
   by a StrKey encoder written independently of the decoder under test — a textbook
   bit-by-bit CRC16-XModem rather than the nibble form in `stellar-verify.ts`. Two
   independent implementations of the same standard agreeing is the check; a fixture
   copied from the source's own arithmetic would only prove it agrees with itself. */
import { strict as assert } from 'node:assert';
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { test } from 'node:test';

import {
  decodeEd25519PublicKey,
  linkMessage,
  registrationMessage,
  verifyStellarSignature,
} from '@/lib/stellar-verify';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const VERSION_ED25519_PUBLIC_KEY = 6 << 3;

/** CRC16-XModem, written the textbook way (poly 0x1021, MSB-first, no reflection). */
function crc16(bytes: Buffer): number {
  let crc = 0x0000;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc & 0xffff;
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32[(value >>> bits) & 31];
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** raw 32-byte ed25519 key -> Stellar `G…` address. */
function encodeStellarAddress(raw: Buffer): string {
  const payload = Buffer.concat([Buffer.from([VERSION_ED25519_PUBLIC_KEY]), raw]);
  const sum = crc16(payload);
  return base32Encode(Buffer.concat([payload, Buffer.from([sum & 0xff, (sum >>> 8) & 0xff])]));
}

function newAccount() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' });
  const raw = Buffer.from(spki.subarray(spki.length - 32));
  return {
    raw,
    address: encodeStellarAddress(raw),
    sign: (message: string) => cryptoSign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64'),
  };
}

/** Swap one character of a base32 string for a different valid one. */
function mutate(address: string, index: number): string {
  const ch = address[index];
  const next = B32[(B32.indexOf(ch) + 1) % B32.length];
  return address.slice(0, index) + next + address.slice(index + 1);
}

test('a generated address round-trips through the decoder', () => {
  for (let i = 0; i < 20; i++) {
    const account = newAccount();
    assert.match(account.address, /^G[A-Z2-7]{55}$/, 'the independent encoder produced a malformed address');
    assert.deepEqual(decodeEd25519PublicKey(account.address), account.raw);
  }
});

test('the checksum rejects every single-character corruption', () => {
  // A decoder that ignored the CRC would accept an address a user mistyped by one
  // character and provision an account nobody controls.
  const { address } = newAccount();
  for (let i = 1; i < address.length; i++) {
    assert.equal(decodeEd25519PublicKey(mutate(address, i)), null, `corruption at index ${i} was accepted`);
  }
});

test('decodeEd25519PublicKey rejects anything that is not a G-address', () => {
  const { address, raw } = newAccount();
  // Valid StrKey arithmetic, wrong version byte: 18 << 3 is the SECRET seed prefix.
  const seedPayload = Buffer.concat([Buffer.from([18 << 3]), raw]);
  const seedSum = crc16(seedPayload);
  const wrongVersion = base32Encode(
    Buffer.concat([seedPayload, Buffer.from([seedSum & 0xff, (seedSum >>> 8) & 0xff])]),
  );

  for (const bad of [
    '',
    'G',
    address.slice(0, -1),          // one char short
    address + 'A',                 // one char long
    address.toLowerCase(),         // lowercase is not a Stellar address
    'M' + address.slice(1),        // muxed prefix
    address.slice(0, 10) + '018' + address.slice(13), // 0, 1 and 8 are not in the alphabet
    wrongVersion,
    null, undefined, 42, {}, [address],
  ]) {
    assert.equal(decodeEd25519PublicKey(bad as string), null, `${String(bad).slice(0, 20)} was decoded`);
  }
});

test('a real signature over the real message verifies', () => {
  const account = newAccount();
  const message = registrationMessage('Dev@CosmosPay.lat', account.address, 'nonce-1');
  assert.equal(verifyStellarSignature(account.address, message, account.sign(message)), true);
});

test('verification fails on a tampered message, signature, or address', () => {
  const account = newAccount();
  const other = newAccount();
  const message = registrationMessage('dev@cosmospay.lat', account.address, 'nonce-1');
  const signature = account.sign(message);

  assert.equal(verifyStellarSignature(account.address, message + ' ', signature), false, 'trailing space accepted');
  assert.equal(
    verifyStellarSignature(
      account.address,
      registrationMessage('dev@cosmospay.lat', account.address, 'nonce-2'),
      signature,
    ),
    false,
    'a signature was replayed across nonces',
  );
  assert.equal(verifyStellarSignature(other.address, message, signature), false, 'verified against the wrong account');
  assert.equal(
    verifyStellarSignature(account.address, message, other.sign(message)),
    false,
    'a signature by another account was accepted',
  );

  const flipped = Buffer.from(signature, 'base64');
  flipped[0] ^= 0x01;
  assert.equal(
    verifyStellarSignature(account.address, message, flipped.toString('base64')),
    false,
    'a flipped bit was accepted',
  );
});

test('verifyStellarSignature returns false rather than throwing on malformed input', () => {
  const account = newAccount();
  const message = registrationMessage('dev@cosmospay.lat', account.address, 'n');
  const good = account.sign(message);
  // Note what is NOT here: `good + 'AA'`. Node's base64 decoder stops at the padding, so
  // that string decodes to the very same 64 bytes and verifying it is the correct answer —
  // the signature is carried by the bytes, not by their spelling.
  for (const sig of ['', 'not base64 ***', 'QUJD', good.slice(0, 40), 'A'.repeat(88)]) {
    assert.equal(verifyStellarSignature(account.address, message, sig), false, `${sig.slice(0, 12)} was accepted`);
  }
  assert.equal(verifyStellarSignature('not-an-address', message, good), false);
  assert.equal(verifyStellarSignature(account.address, message, null as unknown as string), false);
});

/* The two challenges exist so a signature collected by one flow cannot be spent on the
   other: registration creates an account, link attaches a Stellar key to one that already
   exists. Identical bytes would collapse that distinction. */
test('the registration and link challenges never collide', () => {
  const args = ['dev@cosmospay.lat', 'GABCD', 'nonce'] as const;
  assert.notEqual(registrationMessage(...args), linkMessage(...args));
  assert.ok(registrationMessage(...args).startsWith('Cosmos Pay Wallet account registration\n'));
  assert.ok(linkMessage(...args).startsWith('Cosmos Pay Wallet account link\n'));
});

test('both challenges normalise the email the same way', () => {
  // The address is a case-sensitive StrKey and must NOT be touched; the email is
  // looked up case-insensitively, so it is trimmed and lowercased into the bytes.
  for (const build of [registrationMessage, linkMessage]) {
    const canonical = build('dev@cosmospay.lat', 'GABCD', 'n');
    assert.equal(build('  Dev@CosmosPay.LAT  ', 'GABCD', 'n'), canonical);
    assert.ok(canonical.includes('account: GABCD'), 'the address was case-folded');
    assert.notEqual(build('dev@cosmospay.lat', 'gabcd', 'n'), canonical);
  }
});
