import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightLines, type CodeLang, type Token } from '@/lib/payments/highlight';

const join = (lines: Token[][]) => lines.map((line) => line.map((t) => t.text).join('')).join('\n');
const kinds = (lines: Token[][], kind: Token['kind']) => lines.flat().filter((t) => t.kind === kind).map((t) => t.text.trim());

const SAMPLES: [CodeLang, string][] = [
  ['bash', `curl https://api.example.test/v1/pay \\\n  -H "Authorization: Bearer $KEY" \\\n  -d '{\n    "amount": "25",\n    "ok": true\n  }'\n# a comment`],
  ['ts', `import { Client } from "@cosmosapp/pay_sdk";\n\nconst intent = await client.paymentIntents.createPay({\n  amount: "25",\n});\nconsole.log(intent.uri); // the link`],
  ['json', `{\n  "id": "evt_1",\n  "amount": 25.5,\n  "paid": true\n}`],
  ['html', `<script src="https://x.test/embed.js" async></script>\n<cosmos-pay-button link="abc"></cosmos-pay-button>`],
];

test('the tokens give back the source exactly, line by line', () => {
  for (const [lang, src] of SAMPLES) {
    const lines = highlightLines(src, lang);
    assert.equal(join(lines), src, lang);
    assert.equal(lines.length, src.split('\n').length, `${lang} line count`);
  }
});

test('TypeScript: keywords, strings, functions, keys and comments', () => {
  const lines = highlightLines(SAMPLES[1][1], 'ts');
  assert.deepEqual(kinds(lines, 'kw'), ['import', 'from', 'const', 'await']);
  assert.ok(kinds(lines, 'str').includes('"@cosmosapp/pay_sdk"'));
  assert.ok(kinds(lines, 'fn').includes('createPay'));
  assert.ok(kinds(lines, 'key').includes('amount'));
  assert.deepEqual(kinds(lines, 'com'), ['// the link']);
});

test('JSON: keys apart from string values', () => {
  const lines = highlightLines(SAMPLES[2][1], 'json');
  assert.deepEqual(kinds(lines, 'key'), ['"id"', '"amount"', '"paid"']);
  assert.deepEqual(kinds(lines, 'str'), ['"evt_1"']);
  assert.deepEqual(kinds(lines, 'num'), ['25.5']);
  assert.deepEqual(kinds(lines, 'kw'), ['true']);
});

test('bash: the command, its flags, and the JSON body inside its quotes', () => {
  const lines = highlightLines(SAMPLES[0][1], 'bash');
  assert.deepEqual(kinds(lines, 'fn'), ['curl']);
  assert.deepEqual(kinds(lines, 'flag'), ['-H', '-d']);
  assert.ok(kinds(lines, 'key').includes('"amount"'), 'body keys are JSON keys');
  assert.ok(kinds(lines, 'kw').includes('true'));
  assert.deepEqual(kinds(lines, 'com'), ['# a comment']);
});

test('HTML: tags, attributes and their values', () => {
  const lines = highlightLines(SAMPLES[3][1], 'html');
  assert.ok(kinds(lines, 'tag').includes('<cosmos-pay-button'));
  assert.deepEqual(kinds(lines, 'attr'), ['src', 'link']);
  assert.deepEqual(kinds(lines, 'str'), ['"https://x.test/embed.js"', '"abc"']);
});
