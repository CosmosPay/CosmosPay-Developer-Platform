// Generate Fumadocs MDX pages for the Cosmos Pay SDK from its `llms/` folder.
//
// Source: the SDK ships AI-readable atomic docs at <sdk>/llms/NN-*.md (see the SDK repo
// `npm run llms`). We turn each into content/docs/sdk/<slug>.mdx with frontmatter + a
// meta.json that preserves the NN ordering. Content is generated, never hand-edited here.
import fs from 'node:fs';
import path from 'node:path';

const SDK_LLMS =
  process.env.SDK_LLMS_DIR ||
  path.resolve(import.meta.dirname, '../../..', 'cosmosjs_sdk/llms');
const OUT = path.resolve(import.meta.dirname, '..', 'content/docs/sdk');
const REPO = 'https://github.com/CosmosPay/CosmosJS_SDK';

/** Quote a string as a safe YAML scalar (JSON double-quote form is valid YAML). */
const yaml = (s) => JSON.stringify(String(s ?? ''));

/** Rewrite source links so they resolve inside Fumadocs (or point at the repo). */
function rewriteLinks(md) {
  return (
    md
      // strip HTML comments — MDX (v3) does not allow them
      .replace(/<!--[\s\S]*?-->/g, '')
      // angle-bracket autolinks <https://…> break MDX; unwrap them
      .replace(/<((?:https?:)\/\/[^>\s]+)>/g, '$1')
      // cross-doc links: ./05-payment-intents.md(#frag) -> ./payment-intents(#frag)
      .replace(
        /\]\((?:\.\/)?\d\d-([a-z0-9-]+)\.md(#[^)]*)?\)/g,
        (_, slug, frag) => `](./${slug}${frag || ''})`,
      )
      // runnable examples live in the repo, not in these docs
      .replace(/\]\(\.\.\/examples\/([^)]+)\)/g, (_, p) => `](${REPO}/tree/main/examples/${p})`)
      // package README / llms bundle
      .replace(/\]\(\.\.\/README\.md\)/g, `](${REPO}#readme)`)
      .replace(/\]\((?:\.\/)?llms(?:-full)?\.txt\)/g, `](${REPO}/tree/main/llms)`)
  );
}

/** Pull the leading `# Title` out of the body (Fumadocs renders the title itself). */
function extractTitleAndBody(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  let title = null;
  const m = lines[i] && lines[i].match(/^#\s+(.+?)\s*$/);
  if (m) {
    title = m[1].trim();
    i++;
  }
  return { title, body: lines.slice(i).join('\n').replace(/^\n+/, '') };
}

/** First prose paragraph, stripped of markdown, for the page description. */
function firstParagraph(body) {
  const lines = body.split(/\r?\n/);
  let j = 0;
  while (j < lines.length && lines[j].trim() === '') j++;
  const buf = [];
  while (j < lines.length && lines[j].trim() !== '') {
    if (/^(#|`{3}|\||[-*]\s|\d+\.\s|>)/.test(lines[j].trim())) break;
    buf.push(lines[j]);
    j++;
  }
  let p = buf
    .join(' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (p.length > 180) p = p.slice(0, 177).trimEnd() + '…';
  return p;
}

const files = fs.readdirSync(SDK_LLMS).filter((f) => /^\d\d-.+\.md$/.test(f)).sort();
if (!files.length) {
  console.error(`[generate-sdk] No NN-*.md files found in ${SDK_LLMS}`);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const pages = [];
for (const f of files) {
  const slug = f.replace(/^\d\d-/, '').replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(SDK_LLMS, f), 'utf8');
  const { title, body } = extractTitleAndBody(raw);
  const out = rewriteLinks(body);
  const fm = `---\ntitle: ${yaml(title || slug)}\ndescription: ${yaml(firstParagraph(out))}\n---\n\n`;
  fs.writeFileSync(path.join(OUT, `${slug}.mdx`), fm + out.trimEnd() + '\n', 'utf8');
  pages.push(slug);
  console.log(`  sdk/${slug}.mdx  (${title || slug})`);
}

fs.writeFileSync(
  path.join(OUT, 'meta.json'),
  JSON.stringify(
    { title: 'SDK', description: '@cosmosapp/pay_sdk — JavaScript / TypeScript SDK', pages },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log(`[generate-sdk] ${pages.length} pages -> ${OUT} (from ${SDK_LLMS})`);
