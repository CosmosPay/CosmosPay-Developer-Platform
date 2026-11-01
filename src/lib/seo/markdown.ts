/* markdown.ts: a page as Markdown, for the Markdown version of every indexable page of the company
   site and the gateway (/<page>.md, src/lib/seo/markdown-urls.ts) and for /llms-full.txt. A
   builder (site-markdown.ts, payments-markdown.ts) describes a page as blocks read from the same
   catalogs and data its components render; this module only writes them out. Headings are
   relative: level 1 is the page's own h1, 2 its sections, 3 what a section holds. The same page
   is written at two depths: on its own (its title the document's `#`, the page's h1 a `##`) and
   inside llms-full.txt (its title a `##` among the others). Pure. */

export type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; code: string; lang?: string };

/** A page as Markdown blocks, with what names it. */
export interface PageDoc {
  /** The page's <title>. */
  title: string;
  /** Its search description. */
  description: string;
  /** The canonical address of this version (its language at ?lang=, English bare). */
  url: string;
  /** The language its text is in. */
  lang: string;
  blocks: Block[];
}

/** What the builders need from outside the catalogs: the origins the pages link (production's, or
 *  the configured ones) and what the components read from astro:env. */
export interface MarkdownInput {
  site: string;
  dev: string;
  payments: string;
  /** The Payments API base the public swap page's calls name (PUBLIC_PAYMENTS_API_URL). */
  api: string;
  /** The company's public profiles (name → URL), in the order the About page lists them. */
  profiles: Record<string, string>;
  /** When an indexable page last changed (ISO; src/lib/seo/page-dates.ts), for the pages that say
   *  so under their lede. Without it they say nothing. */
  modified?: (area: "site" | "payments", path: string, lang: string) => string | null;
}

export const h = (level: number, text: string): Block => ({ kind: "h", level, text });
export const p = (text: string): Block => ({ kind: "p", text });
export const ul = (items: string[]): Block => ({ kind: "ul", items });
export const ol = (items: string[]): Block => ({ kind: "ol", items });
export const table = (head: string[], rows: string[][]): Block => ({ kind: "table", head, rows });
export const code = (source: string, lang?: string): Block => ({ kind: "code", code: source, lang });

/** A Markdown link; the label's brackets are escaped. */
export function link(label: string, href: string): string {
  const target = href.replace(/[()\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
  return `[${label.replace(/([[\]])/g, "\\$1")}](${target})`;
}

/** A label and what it says, as a list item reads it. */
export const term = (label: string, text: string): string => (text ? `**${label}**: ${text}` : `**${label}**`);

/* Copy is plain text: one line, and escaped only where Markdown would read structure into it. A
   paragraph or a list item that starts like a list, a heading or a quote keeps its first
   character as text (a heading or a table cell cannot start a block). */
function inline(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

function lead(text: string): string {
  return inline(text).replace(/^([#>+*-]|\d+[.)])(?=\s)/, "\\$1");
}

const cell = (text: string): string => inline(text).replace(/\|/g, "\\|") || "-";

function fence(source: string, lang = ""): string {
  const longest = Math.max(2, ...[...source.matchAll(/`+/g)].map((m) => m[0].length));
  const marks = "`".repeat(longest + 1);
  return `${marks}${lang}\n${source.replace(/\s+$/, "")}\n${marks}`;
}

function block(b: Block, base: number): string {
  switch (b.kind) {
    case "h":
      return `${"#".repeat(Math.min(6, base + b.level - 1))} ${inline(b.text)}`;
    case "p":
      return lead(b.text);
    case "ul":
      return b.items.map((item) => `- ${lead(item)}`).join("\n");
    case "ol":
      return b.items.map((item, i) => `${i + 1}. ${lead(item)}`).join("\n");
    case "table":
      return [
        `| ${b.head.map(cell).join(" | ")} |`,
        `| ${b.head.map(() => "---").join(" | ")} |`,
        ...b.rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
      ].join("\n");
    case "code":
      return fence(b.code, b.lang);
  }
}

function hasContent(b: Block): boolean {
  switch (b.kind) {
    case "ul":
    case "ol":
      return b.items.length > 0;
    case "table":
      return b.rows.length > 0;
    case "code":
      return b.code.trim() !== "";
    default:
      return b.text.trim() !== "";
  }
}

/** Blocks as Markdown, the page's h1 at heading level `base`. Empty blocks are left out. */
export function renderBlocks(blocks: readonly Block[], base: number): string {
  return blocks
    .filter(hasContent)
    .map((b) => block(b, base))
    .join("\n\n");
}

/** A page under its title (a heading of `level`), its address and its description, then its
 *  content one level down. */
export function renderPage(doc: PageDoc, level: 1 | 2 = 1): string {
  const head = `${"#".repeat(level)} ${inline(doc.title)}\n\nURL: ${doc.url}\n\n> ${inline(doc.description)}`;
  return `${head}\n\n${renderBlocks(doc.blocks, level + 1)}\n`;
}
