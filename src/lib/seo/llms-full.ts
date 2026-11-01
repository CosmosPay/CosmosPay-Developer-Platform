/* llms-full.ts: /llms-full.txt for the company site and the gateway: the English text of every
   indexable page of that host in one file, each under a `## <title>` with its canonical address
   and description, in the order of the host's sitemap (src/lib/seo/indexable.ts). Every page is
   the same document its Markdown version serves (src/lib/seo/page-markdown.ts), read from the
   catalogs and data the page renders, so the file can never say other than the pages; the rates
   come from src/lib/plans.ts. The platform's is the docs' own (/docs/llms-full.txt): there the
   route redirects. Pure, so tests/unit/seoLlmsFull.test.ts covers it. */
import { indexablePages, type IndexableArea } from "@/lib/seo/indexable";
import { renderPage, type MarkdownInput, type PageDoc } from "@/lib/seo/markdown";
import { markdownUrl } from "@/lib/seo/markdown-urls";
import { pageDoc } from "@/lib/seo/page-markdown";
import { SITE_SUMMARY, paymentsSummary } from "@/lib/seo/llms";

/** Every indexable page of `area`, in English, as documents (sitemap order). */
export function llmsFullDocs(area: IndexableArea, input: MarkdownInput): PageDoc[] {
  return indexablePages(area).flatMap((page) => pageDoc(area, page.path, "en", input) ?? []);
}

/** /llms-full.txt of the company site (`site`) or the gateway (`payments`). */
export function llmsFullTxt(area: IndexableArea, input: MarkdownInput): string {
  const origin = input[area];
  const docs = llmsFullDocs(area, input);
  const name = area === "site" ? "Cosmos Pay" : "Cosmos Pay Payments";
  const summary = area === "site" ? SITE_SUMMARY : paymentsSummary(input.site);
  const intro = `Every page of ${new URL(origin).host} in English, in one file: each under its title, with its address and description. The short index is ${origin}/llms.txt. Each page is also Markdown at its own address with .md (the home is ${markdownUrl(origin, "/")}), in every language it is written in (?lang=es, pt, fr, de, hi or zh). The developer documentation is ${input.dev}/docs/llms-full.txt.`;
  return `# ${name}\n\n> ${summary}\n\n${intro}\n\n${docs.map((doc) => renderPage(doc, 2)).join("\n")}`;
}
