import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docsLink, docsRoot, isSlashlessDocsLink, loginUrl, normalizeOrigin } from '@/lib/urls';
import { isSafeNextPath } from '@/lib/safe-next';

test('normalizeOrigin drops trailing slashes and whitespace', () => {
  assert.equal(normalizeOrigin(' https://dev.cosmospay.lat/// '), 'https://dev.cosmospay.lat');
  assert.equal(normalizeOrigin('https://dev.cosmospay.lat'), 'https://dev.cosmospay.lat');
});

test('loginUrl points at the platform sign-in', () => {
  assert.equal(loginUrl('https://dev.cosmospay.lat/'), 'https://dev.cosmospay.lat/login');
});

test('loginUrl carries a same-origin next path, encoded', () => {
  assert.equal(
    loginUrl('https://dev.cosmospay.lat', '/dashboard?view=settings'),
    'https://dev.cosmospay.lat/login?next=%2Fdashboard%3Fview%3Dsettings',
  );
});

test('loginUrl drops a next that would leave the platform', () => {
  for (const next of ['//evil.example', '/\\evil.example', 'https://evil.example', 'dashboard', '']) {
    assert.equal(loginUrl('https://dev.cosmospay.lat', next), 'https://dev.cosmospay.lat/login', next);
  }
});

test('isSafeNextPath accepts only single-slash paths', () => {
  assert.equal(isSafeNextPath('/'), true);
  assert.equal(isSafeNextPath('/dashboard'), true);
  assert.equal(isSafeNextPath('//host'), false);
  assert.equal(isSafeNextPath('/\\host'), false);
  assert.equal(isSafeNextPath('javascript:alert(1)'), false);
});

test('docsLink writes every docs page at its trailing-slash address, files as they are', () => {
  const root = docsRoot('https://dev.cosmospay.lat/');
  assert.equal(root, 'https://dev.cosmospay.lat/docs/');
  assert.equal(docsLink(root), 'https://dev.cosmospay.lat/docs/');
  assert.equal(docsLink('https://dev.cosmospay.lat/docs'), 'https://dev.cosmospay.lat/docs/', 'a root without its slash');
  assert.equal(docsLink(root, '/api'), 'https://dev.cosmospay.lat/docs/api/');
  assert.equal(docsLink(root, 'api'), 'https://dev.cosmospay.lat/docs/api/');
  assert.equal(docsLink(root, '/sdk/server/webhooks/'), 'https://dev.cosmospay.lat/docs/sdk/server/webhooks/');
  assert.equal(docsLink(root, '/api/payment-intents#create'), 'https://dev.cosmospay.lat/docs/api/payment-intents/#create');
  assert.equal(docsLink(root, '/getting-started?ref=x'), 'https://dev.cosmospay.lat/docs/getting-started/?ref=x');
  assert.equal(docsLink(root, '/llms.txt'), 'https://dev.cosmospay.lat/docs/llms.txt');
  assert.equal(docsLink(root, '/openapi.json'), 'https://dev.cosmospay.lat/docs/openapi.json');
  assert.equal(docsLink(root, '/llms.mdx/getting-started/content.md'), 'https://dev.cosmospay.lat/docs/llms.mdx/getting-started/content.md');
});

test('isSlashlessDocsLink finds a docs page linked without its slash, and nothing else', () => {
  const root = 'https://dev.cosmospay.lat/docs/';
  for (const href of [
    'https://dev.cosmospay.lat/docs',
    'https://dev.cosmospay.lat/docs?lang=es',
    'https://dev.cosmospay.lat/docs/api',
    'https://dev.cosmospay.lat/docs/getting-started#keys',
    'https://dev.cosmospay.lat/docs/sdk/server/overview',
  ]) {
    assert.equal(isSlashlessDocsLink(href, root), true, href);
  }
  for (const href of [
    'https://dev.cosmospay.lat/docs/',
    'https://dev.cosmospay.lat/docs/api/',
    'https://dev.cosmospay.lat/docs/getting-started/#keys',
    'https://dev.cosmospay.lat/docs/llms.txt',
    'https://dev.cosmospay.lat/docs/openapi.json',
    'https://dev.cosmospay.lat/docsearch',
    'https://dev.cosmospay.lat/dashboard',
    'https://payments.cosmospay.lat/faq',
  ]) {
    assert.equal(isSlashlessDocsLink(href, root), false, href);
  }
  // Every link docsLink writes passes.
  for (const path of ['', '/api', 'sdk/server/webhooks', '/embed#button', '/llms.txt']) {
    assert.equal(isSlashlessDocsLink(docsLink(root, path), root), false, path);
  }
});
