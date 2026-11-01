import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BING_SITE_AUTH_PATH, bingSiteAuthXml, isBingUserCode } from '@/lib/seo/bing-site-auth';

const CODE = '0123456789ABCDEF0123456789ABCDEF';

test('a Bing user code is 32 hexadecimal characters', () => {
  for (const code of [CODE, CODE.toLowerCase(), 'F'.repeat(32)]) assert.ok(isBingUserCode(code), code);
  for (const code of [undefined, null, '', 42, CODE.slice(1), `${CODE}0`, `${CODE.slice(1)}G`, `<${CODE.slice(2)}>`, `${CODE.slice(0, 16)} ${CODE.slice(17)}`]) {
    assert.ok(!isBingUserCode(code), String(code));
  }
});

test('the file is at the root under the name Bing asks for, in its own layout', () => {
  assert.equal(BING_SITE_AUTH_PATH, '/BingSiteAuth.xml');
  assert.equal(bingSiteAuthXml(CODE), `<?xml version="1.0"?>\n<users>\n\t<user>${CODE}</user>\n</users>\n`);
  // Bing hands the code out in upper case; a pasted lower-case copy is written as Bing gave it.
  assert.equal(bingSiteAuthXml(CODE.toLowerCase()), bingSiteAuthXml(CODE));
});

test('without a valid code there is no file (a 404), never a malformed one', () => {
  for (const code of [undefined, '', 'not-a-code', `${CODE}</user><user>x`]) assert.equal(bingSiteAuthXml(code), null, String(code));
});
