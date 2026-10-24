import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSep7Pay } from '@/lib/payments/sep7';

const DEST = 'GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO';
const ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

test('parseSep7Pay reads every field the page shows', () => {
  assert.deepEqual(
    parseSep7Pay(`web+stellar:pay?destination=${DEST}&amount=12.5&memo=42&asset_code=USDC&asset_issuer=${ISSUER}&callback=url%3Ahttps%3A%2F%2Fshop.example%2Fcb&origin_domain=shop.example`),
    {
      destination: DEST,
      amount: '12.5',
      memo: '42',
      asset: 'USDC',
      assetIssuer: ISSUER,
      network: 'public',
      callbackHost: 'shop.example',
      originDomain: 'shop.example',
    },
  );
});

test('parseSep7Pay defaults to native XLM and is case-insensitive on the scheme', () => {
  const pay = parseSep7Pay(`WEB+STELLAR:pay?destination=${DEST}`);
  assert.equal(pay?.asset, 'XLM');
  assert.equal(pay?.assetIssuer, null);
  assert.equal(pay?.callbackHost, null);
  assert.equal(pay?.originDomain, null);
});

test('parseSep7Pay refuses a non-native asset without a valid issuer', () => {
  // Anyone can issue a "USDC": without the issuer the page would show a name, not an asset.
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&asset_code=USDC`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&asset_code=USDC&asset_issuer=GBAD`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&asset_code=TOO-LONG-CODE!&asset_issuer=${ISSUER}`), null);
});

test('parseSep7Pay refuses callbacks and origin domains it cannot describe', () => {
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&callback=https%3A%2F%2Fshop.example`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&callback=url%3Anot%20a%20url`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&origin_domain=https%3A%2F%2Fshop.example`), null);
});

test('parseSep7Pay refuses a URI a wallet could read differently', () => {
  // URLSearchParams.get() takes the first value; a wallet might take the last.
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&destination=${ISSUER}`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&amount=1&amount=1000`), null);
  // A case variant or an unknown key is either ignored or honoured, depending on the reader.
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&Amount=1000`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&replace=x`), null);
});

test('parseSep7Pay names the network and refuses one it does not know', () => {
  const testnet = encodeURIComponent('Test SDF Network ; September 2015');
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&network_passphrase=${testnet}`)?.network, 'testnet');
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}`)?.network, 'public');
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&network_passphrase=Some%20Other%20Net`), null);
  assert.equal(parseSep7Pay(`web+stellar:pay?destination=${DEST}&memo=1&memo_type=MEMO_WEIRD`), null);
});

test('parseSep7Pay refuses tx links, other schemes and bad accounts', () => {
  assert.equal(parseSep7Pay('web+stellar:tx?xdr=AAAA'), null);
  assert.equal(parseSep7Pay(`solana:${DEST}`), null);
  assert.equal(parseSep7Pay('web+stellar:pay?destination=GNOTANACCOUNT'), null);
  assert.equal(parseSep7Pay('web+stellar:pay'), null);
});
