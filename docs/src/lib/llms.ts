import type * as PageTree from 'fumadocs-core/page-tree';
import { appName, docsOrigin } from '@/lib/shared';
import { DEFAULT_DOCS_LANGUAGE, DOCS_LANGUAGES, DOCS_LOCALE_ITEMS } from '@/lib/i18n-config';
import { canonicalUrl, docsUrl, type DocsPage, isTranslation, source } from '@/lib/source';
import { renderOpenAPITagMarkdown } from '@/lib/openapi-markdown';

// The docs as text for LLMs and coding agents: /docs/llms.txt (the index), /docs/llms-full.txt
// (every English page in one file) and /docs/llms.mdx/<page>/content.md (one page). Links are
// absolute (https://dev.cosmospay.lat/docs/...) so they resolve wherever the text is pasted, and
// the API reference pages carry their operations rendered from openapi.json.

export const LLMS_SUMMARY =
  'Developer documentation for Cosmos Pay: the @cosmosapp/pay_sdk JavaScript/TypeScript SDK and the Payments REST API for accepting payments on Stellar (SEP-7), Solana (Solana Pay) and Monad (EIP-681), plus swaps, webhooks, products, customers and analytics.';

function isOpenAPIPage(page: DocsPage): boolean {
  return Boolean((page.data as { _openapi?: unknown })._openapi);
}

/** A root-relative link in the content (`/sdk/server/webhooks#x`, as the site resolves it under
 *  /docs) as an absolute docs URL in the canonical trailing-slash form. */
function absoluteDocsLink(target: string): string {
  const cut = target.search(/[?#]/);
  let pathname = cut < 0 ? target : target.slice(0, cut);
  const rest = cut < 0 ? '' : target.slice(cut);
  if (pathname === '/docs' || pathname.startsWith('/docs/')) pathname = pathname.slice('/docs'.length) || '/';
  const last = pathname.split('/').pop() ?? '';
  if (!pathname.endsWith('/') && !last.includes('.')) pathname += '/';
  return `${docsOrigin}${pathname}${rest}`;
}

function attribute(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`\\b${name}=(?:"([^"]*)"|\\{"([^"]*)"\\})`));
  return match ? (match[1] ?? match[2]) : undefined;
}

/** Plain Markdown out of the processed MDX: <Card>s become list items, links become absolute. */
function toPortableMarkdown(markdown: string): string {
  return markdown
    .replace(/^[ \t]*<\/?Cards>[ \t]*\r?\n?/gm, '')
    .replace(/^[ \t]*<Card\b([^>]*?)\/>/gm, (whole, attrs: string) => {
      const title = attribute(attrs, 'title');
      const href = attribute(attrs, 'href');
      if (!title || !href) return whole;
      const description = attribute(attrs, 'description');
      return `- [${title}](${href})${description ? `: ${description}` : ''}`;
    })
    .replace(/(\]\(|href=")(\/(?!\/)[^)"\s]*)/g, (_, lead: string, target: string) => `${lead}${absoluteDocsLink(target)}`);
}

/** One page as Markdown: its title and canonical URL, its description, then its content. */
export async function getLLMText(page: DocsPage): Promise<string> {
  const body = isOpenAPIPage(page)
    ? renderOpenAPITagMarkdown(page.slugs[page.slugs.length - 1] ?? '')
    : toPortableMarkdown(await page.data.getText('processed'));
  const description = page.data.description ? `> ${page.data.description}\n\n` : '';
  return `# ${page.data.title} (${canonicalUrl(page)})\n\n${description}${body.trim()}\n`;
}

function nodeTitle(node: PageTree.Node | PageTree.Root): string {
  if ('type' in node && node.type === 'page') {
    const page = source.getNodePage(node, DEFAULT_DOCS_LANGUAGE);
    if (page) return page.data.title;
  } else if (!('type' in node) || node.type !== 'separator') {
    const meta = source.getNodeMeta(node as PageTree.Folder, DEFAULT_DOCS_LANGUAGE);
    if (meta?.data.title) return meta.data.title;
  }
  return typeof node.name === 'string' ? node.name : '';
}

function nodeDescription(node: PageTree.Item | PageTree.Folder): string {
  if (node.type === 'page') return source.getNodePage(node, DEFAULT_DOCS_LANGUAGE)?.data.description ?? '';
  const meta = source.getNodeMeta(node, DEFAULT_DOCS_LANGUAGE);
  return meta?.data.description ?? (typeof node.description === 'string' ? node.description : '');
}

function listItem(label: string, description: string, depth: number): string {
  const text = description.trim();
  return `${'  '.repeat(depth)}- ${label}${text ? `: ${text}` : ''}`;
}

function indexNode(node: PageTree.Item | PageTree.Folder, depth: number, out: string[]) {
  if (node.type === 'page') {
    const page = source.getNodePage(node, DEFAULT_DOCS_LANGUAGE);
    if (page) out.push(listItem(`[${page.data.title}](${docsUrl(page.slugs)})`, nodeDescription(node), depth));
    return;
  }
  out.push(listItem(nodeTitle(node), nodeDescription(node), depth));
  if (node.index) indexNode(node.index, depth + 1, out);
  for (const child of node.children) if (child.type !== 'separator') indexNode(child, depth + 1, out);
}

/** The English pages in sidebar order. */
export function englishPagesInOrder(): DocsPage[] {
  const seen = new Set<string>();
  const pages: DocsPage[] = [];
  const add = (page: DocsPage | undefined) => {
    if (!page || seen.has(page.url)) return;
    seen.add(page.url);
    pages.push(page);
  };
  const walk = (nodes: PageTree.Node[]) => {
    for (const node of nodes) {
      if (node.type === 'page') add(source.getNodePage(node, DEFAULT_DOCS_LANGUAGE));
      else if (node.type === 'folder') {
        if (node.index) add(source.getNodePage(node.index, DEFAULT_DOCS_LANGUAGE));
        walk(node.children);
      }
    }
  };
  walk(source.getPageTree(DEFAULT_DOCS_LANGUAGE).children);
  for (const page of source.getPages(DEFAULT_DOCS_LANGUAGE)) add(page);
  return pages;
}

const HEADER = [
  `# ${appName}`,
  '',
  `> ${LLMS_SUMMARY}`,
  '',
  `Every page is also served as Markdown at ${docsOrigin}/llms.mdx/<page>/content.md (for example ${docsOrigin}/llms.mdx/getting-started/content.md). The Payments REST API is described as OpenAPI 3.0 at ${docsOrigin}/openapi.json.`,
];

/** /docs/llms.txt: the English pages by sidebar section, then the translations and the files. */
export function llmsIndex(): string {
  const out = [...HEADER];
  let opened = false;
  for (const node of source.getPageTree(DEFAULT_DOCS_LANGUAGE).children) {
    if (node.type === 'separator') {
      out.push('', `## ${nodeTitle(node) || 'Docs'}`, '');
      opened = true;
      continue;
    }
    if (!opened) {
      out.push('', '## Guides', '');
      opened = true;
    }
    indexNode(node, 0, out);
  }

  out.push('', '## Translations', '');
  for (const lang of DOCS_LANGUAGES) {
    if (lang === DEFAULT_DOCS_LANGUAGE) continue;
    const name = DOCS_LOCALE_ITEMS.find((item) => item.locale === lang)?.name ?? lang;
    const translated = source.getPages(lang).filter(isTranslation).length;
    if (translated) {
      out.push(listItem(`[${name}](${docsUrl([], lang)})`, `${translated} pages translated; the other pages are in English`, 0));
    }
  }

  out.push('', '## Optional', '');
  out.push(listItem(`[Full text](${docsOrigin}/llms-full.txt)`, 'every English page in one file, the API reference included', 0));
  out.push(listItem(`[OpenAPI document](${docsOrigin}/openapi.json)`, 'the Payments REST API (OpenAPI 3.0)', 0));
  return `${out.join('\n')}\n`;
}

/** /docs/llms-full.txt: every English page, in sidebar order. */
export async function llmsFull(): Promise<string> {
  const pages = await Promise.all(englishPagesInOrder().map(getLLMText));
  return `${[`# ${appName}`, '', `> ${LLMS_SUMMARY}`].join('\n')}\n\n${pages.join('\n')}`;
}
