import type * as PageTree from 'fumadocs-core/page-tree';
import { appName, docsOrigin } from '@/lib/shared';
import { DEFAULT_DOCS_LANGUAGE, DOCS_LANGUAGES, DOCS_LOCALE_ITEMS } from '@/lib/i18n-config';
import { canonicalUrl, docsUrl, type DocsPage, isTranslation, markdownPageUrl, source } from '@/lib/source';
import { renderOpenAPITagMarkdown } from '@/lib/openapi-markdown';

// The docs as text for LLMs and coding agents: /docs/llms.txt (the index, which links each page's
// Markdown), /docs/llms-full.txt (every English page in one file) and each page as Markdown at its
// own address with .md (/docs/<page>.md, written from /docs/llms.mdx/<page>/content.md after the
// build: scripts/write-markdown-pages.mjs). Links are absolute (https://dev.cosmospay.lat/docs/...)
// so they resolve wherever the text is pasted, and the API reference pages carry their operations
// rendered from openapi.json.

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

/** A <Callout> as a Markdown blockquote: its title in bold, then its text. */
function calloutToQuote(attrs: string, body: string): string {
  const title = attribute(attrs, 'title');
  const lines = [...(title ? [`**${title}**`, ''] : []), ...body.replace(/\s+$/, '').split(/\r?\n/)];
  return lines.map((line) => (line.trim() ? `> ${line.trim()}` : '>')).join('\n');
}

/**
 * Fumadocs' MDX leftovers outside code blocks: a heading's explicit id (`## Title [#id]`) goes,
 * and a <Callout> becomes a blockquote. Agents and search engines read these files as plain
 * Markdown, where both were noise (SEO re-audit, 2026-11-01). Fenced code is left as written.
 */
export function stripMdxLeftovers(markdown: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  let callout: { attrs: string; body: string[] } | null = null;
  for (const line of markdown.split('\n')) {
    const marker = /^[ \t]*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      (callout ? callout.body : out).push(line);
      continue;
    }
    if (marker) {
      fence = marker;
      (callout ? callout.body : out).push(line);
      continue;
    }
    if (callout) {
      if (/^[ \t]*<\/Callout>[ \t]*\r?$/.test(line)) {
        out.push(calloutToQuote(callout.attrs, callout.body.join('\n')));
        callout = null;
      } else callout.body.push(line);
      continue;
    }
    const open = /^[ \t]*<Callout\b([^>]*)>[ \t]*\r?$/.exec(line);
    if (open) {
      callout = { attrs: open[1] ?? '', body: [] };
      continue;
    }
    out.push(line.replace(/^(#{1,6}[ \t].*?)[ \t]+\[#[^\]\s]+\][ \t]*(\r?)$/, '$1$2'));
  }
  // An unclosed callout keeps its text rather than losing it.
  if (callout) out.push(calloutToQuote(callout.attrs, callout.body.join('\n')));
  return out.join('\n');
}

/** Plain Markdown out of the processed MDX: <Card>s become list items, <Callout>s blockquotes,
 *  headings lose their explicit ids, links become absolute. */
function toPortableMarkdown(markdown: string): string {
  return stripMdxLeftovers(markdown)
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
    if (page) out.push(listItem(`[${page.data.title}](${markdownPageUrl(page)})`, nodeDescription(node), depth));
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
  `Each link below is the page as Markdown, at the page's address with .md (${docsOrigin}/getting-started.md is ${docsOrigin}/getting-started/; the home is ${docsOrigin}/index.md), in every language it is translated to (${docsOrigin}/es/embed.md). The docs are a static export, so the page's own address answers HTML whatever the Accept header asks: request the .md address for Markdown. The Payments REST API is described as OpenAPI 3.0 at ${docsOrigin}/openapi.json.`,
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
      const home = source.getPage([], lang);
      const link = home && isTranslation(home) ? markdownPageUrl(home) : docsUrl([], lang);
      out.push(listItem(`[${name}](${link})`, `${translated} pages translated; the other pages are in English`, 0));
    }
  }

  out.push('', '## Optional', '');
  out.push(listItem(`[Full text](${docsOrigin}/llms-full.txt)`, 'every English page in one file, the API reference included', 0));
  for (const section of Object.values(LLMS_SECTIONS)) {
    out.push(listItem(`[${section.title}](${docsOrigin}/${section.path})`, section.description, 0));
  }
  out.push(listItem(`[OpenAPI document](${docsOrigin}/openapi.json)`, 'the Payments REST API (OpenAPI 3.0)', 0));
  return `${out.join('\n')}\n`;
}

/** Whether a page is part of the API reference (/docs/api/...). */
function isApiPage(page: DocsPage): boolean {
  return page.slugs[0] === 'api';
}

/**
 * The full text split in two, so an assistant can load the part it needs: llms-full.txt was over
 * 500 KB, more than many context windows take (SEO re-audit, 2026-11-01). Each file has the same
 * header as llms-full.txt, which stays as the complete one.
 */
export const LLMS_SECTIONS = {
  sdk: {
    path: 'llms-sdk.txt',
    title: 'Guides and SDK',
    description: 'every English guide and the @cosmosapp/pay_sdk reference in one file, without the REST API reference',
    include: (page: DocsPage) => !isApiPage(page),
  },
  api: {
    path: 'llms-api.txt',
    title: 'REST API reference',
    description: 'every Payments REST API operation, rendered from openapi.json, in one file',
    include: (page: DocsPage) => isApiPage(page),
  },
} as const;

/** /docs/llms-sdk.txt and /docs/llms-api.txt: one part of llms-full.txt, in the same order. */
export async function llmsSection(key: keyof typeof LLMS_SECTIONS): Promise<string> {
  const section = LLMS_SECTIONS[key];
  const pages = await Promise.all(englishPagesInOrder().filter(section.include).map(getLLMText));
  return `${[`# ${appName}: ${section.title}`, '', `> ${LLMS_SUMMARY}`].join('\n')}\n\n${pages.join('\n')}`;
}

/** /docs/llms-full.txt: every English page, in sidebar order. */
export async function llmsFull(): Promise<string> {
  const pages = await Promise.all(englishPagesInOrder().map(getLLMText));
  return `${[`# ${appName}`, '', `> ${LLMS_SUMMARY}`].join('\n')}\n\n${pages.join('\n')}`;
}
