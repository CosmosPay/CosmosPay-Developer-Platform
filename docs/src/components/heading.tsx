'use client';
import type { ComponentPropsWithoutRef } from 'react';
import { CopyCheckIcon, LinkIcon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/lib/cn';
import { DOCS_TRANSLATIONS } from '@/lib/docs-i18n';
import { useHydrated } from '@/lib/use-hydrated';

// Fumadocs UI's <Heading> (fumadocs-ui/components/heading) with one change: its copy-link
// button's name. Fumadocs writes "Copy Anchor Link" as a visually hidden text node inside the
// heading, so every heading's text (what search engines, the llms tools and anything that
// extracts text read) ended in it: "The payment flowCopy Anchor Link". Here the button is
// icon-only and named by aria-label, so the heading's text is its title alone. The labels use
// Fumadocs' own translation keys, from the docs' catalog (lib/docs-i18n.ts). "Copied" is
// announced through a live region that stays empty until a copy, so the exported HTML has no
// text there either. The button renders after hydration: it is invisible until the heading is
// hovered or focused and copies through script, and written into the export it was about 880
// bytes per heading (dozens per API reference page).

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export type HeadingProps = ComponentPropsWithoutRef<'h1'> & { as?: HeadingTag };

const COPY_KEY = 'Copy Anchor Link(heading anchor)(aria-label)';
const COPIED_KEY = 'Copied Anchor Link(heading anchor)(aria-label)';

export function Heading({ as, ...props }: HeadingProps) {
  const As = as ?? 'h1';
  const { locale } = useI18n();
  const translations = locale ? DOCS_TRANSLATIONS[locale] : undefined;
  const hydrated = useHydrated();
  const [copied, onCopy] = useCopyButton(() => {
    if (!props.id) return;
    const url = new URL(window.location.href);
    url.hash = props.id;
    return navigator.clipboard.writeText(url.href);
  });

  if (!props.id) return <As {...props} />;

  return (
    <As {...props} className={cn('group/heading flex scroll-m-28 flex-row items-center gap-1', props.className)}>
      <a data-card="" href={`#${props.id}`}>
        {props.children}
      </a>
      {hydrated && (
        <button
          type="button"
          aria-label={translations?.[COPY_KEY] ?? 'Copy Anchor Link'}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
            'not-prose shrink-0 text-fd-muted-foreground opacity-0 transition-opacity group-hover/heading:opacity-100 focus-visible:opacity-100',
          )}
          onClick={onCopy}
        >
          {copied ? <CopyCheckIcon aria-hidden /> : <LinkIcon aria-hidden />}
          <span className="sr-only" aria-live="polite">
            {copied ? (translations?.[COPIED_KEY] ?? 'Copied Anchor Link') : ''}
          </span>
        </button>
      )}
    </As>
  );
}
