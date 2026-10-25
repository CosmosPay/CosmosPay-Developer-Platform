import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContactRateLimit, MIN_FILL_MS, contactEmail, looksAutomated, parseContact } from '@/lib/payments/contact';

const GOOD = { name: 'Ana Pérez', email: 'ana@tienda.com', company: 'Tienda Sur', topic: 'pricing', message: 'Quiero saber qué plan me conviene.' };

test('parseContact accepts a complete form and trims it', () => {
  const r = parseContact({ ...GOOD, name: '  Ana Pérez  ', company: '' });
  assert.deepEqual(r, { ok: true, value: { ...GOOD, company: '' } });
});

test('parseContact names every wrong field', () => {
  const r = parseContact({ name: 'A', email: 'not-an-email', company: 'x'.repeat(121), topic: 'free-money', message: 'short' });
  assert.deepEqual(r, { ok: false, errors: ['name', 'email', 'company', 'topic', 'message'] });
});

test('parseContact refuses a line break in a one-line field (no header injection)', () => {
  assert.deepEqual(parseContact({ ...GOOD, name: 'Ana\r\nBcc: x@y.z' }), { ok: false, errors: ['name'] });
  assert.deepEqual(parseContact({ ...GOOD, email: 'ana@tienda.com\nBcc: x@y.z' }), { ok: false, errors: ['email'] });
});

test('parseContact keeps line breaks in the message but not other control characters', () => {
  assert.equal(parseContact({ ...GOOD, message: 'Hola.\nTengo dos tiendas.\tGracias.' }).ok, true);
  assert.deepEqual(parseContact({ ...GOOD, message: 'Hola\u0000 mundo, una prueba.' }), { ok: false, errors: ['message'] });
});

test('looksAutomated catches the honeypot and a post faster than a person', () => {
  const now = 1_000_000;
  assert.equal(looksAutomated({ website: '', started: String(now - MIN_FILL_MS - 1) }, now), false);
  assert.equal(looksAutomated({ website: 'http://spam', started: String(now - 60_000) }, now), true);
  assert.equal(looksAutomated({ website: '', started: String(now - 500) }, now), true);
  assert.equal(looksAutomated({ website: '' }, now), true);
});

test('ContactRateLimit lets a network write a few times per window', () => {
  const limit = new ContactRateLimit(2, 1000);
  assert.equal(limit.take('1.2.3.4', 0), true);
  assert.equal(limit.take('1.2.3.4', 10), true);
  assert.equal(limit.take('1.2.3.4', 20), false);
  assert.equal(limit.take('5.6.7.8', 20), true);
  assert.equal(limit.take('1.2.3.4', 1001), true);
});

test('contactEmail escapes the visitor\'s words in the HTML part', () => {
  const mail = contactEmail({ ...GOOD, topic: 'other', message: '<script>alert(1)</script> & más' }, { page: '/faq', lang: 'es' });
  assert.match(mail.subject, /^Payments contact: Something else, Ana Pérez \(Tienda Sur\)$/);
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(mail.html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; más'));
  assert.ok(mail.text.includes('Email: ana@tienda.com'));
});
