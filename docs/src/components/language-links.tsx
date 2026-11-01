'use client';

export interface LanguageLink {
  lang: string;
  href: string;
  name: string;
}

/**
 * The page in the other languages it is written in, as plain links in the sidebar footer, so
 * crawlers (and anyone without script) find the translations; the navbar's language picker
 * navigates from script. A click records the choice in the shared `cosmospay-lang` cookie first,
 * as the picker does, so the docs Provider does not send the reader back to the old language.
 */
export function LanguageLinks({ label, links }: { label: string; links: LanguageLink[] }) {
  return (
    <nav aria-label={label} className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-fd-muted-foreground">
      {links.map((link) => (
        <a
          key={link.lang}
          href={link.href}
          hrefLang={link.lang}
          lang={link.lang}
          className="transition-colors hover:text-fd-accent-foreground"
          onClick={() => {
            document.cookie = `cosmospay-lang=${link.lang};path=/;max-age=31536000;samesite=lax`;
          }}
        >
          {link.name}
        </a>
      ))}
    </nav>
  );
}
