import Link from 'fumadocs-core/link';
import type { CardProps } from 'fumadocs-ui/components/card';
import { cn } from '@/lib/cn';

export { Cards } from 'fumadocs-ui/components/card';

/**
 * Fumadocs' <Card> with the title as text instead of an <h3>. Cards usually open a page, right
 * under its <h1>, so the <h3> skipped a heading level (Lighthouse "heading-order" on the docs
 * home, getting started and the API index, in every language) and put each card title in the
 * page outline. The title is still the start of the card link's accessible name. Same markup and
 * classes as fumadocs-ui otherwise.
 */
export function Card({ icon, title, description, ...props }: CardProps) {
  const className = cn(
    'block rounded-xl border bg-fd-card p-4 text-fd-card-foreground transition-colors @max-lg:col-span-full',
    props.href && 'hover:bg-fd-accent/80',
    props.className,
  );
  const content = (
    <>
      {icon ? (
        <div className="not-prose mb-2 w-fit shadow-md rounded-lg border bg-fd-muted p-1.5 text-fd-muted-foreground [&_svg]:size-4">
          {icon}
        </div>
      ) : null}
      <p className="not-prose mb-1 text-sm font-medium">{title}</p>
      {description ? <p className="my-0! text-sm text-fd-muted-foreground">{description}</p> : null}
      <div className="text-sm text-fd-muted-foreground prose-no-margin empty:hidden">{props.children}</div>
    </>
  );

  if (props.href) {
    return (
      <Link {...props} href={props.href} data-card className={className}>
        {content}
      </Link>
    );
  }
  return (
    <div {...props} data-card className={className}>
      {content}
    </div>
  );
}
