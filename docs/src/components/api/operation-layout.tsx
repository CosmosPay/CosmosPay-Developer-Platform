'use client';
// The layout of an API operation and of its examples column (`renderOperationLayout` and
// `renderAPIExampleLayout` in components/api-page.tsx): fumadocs-openapi 12.5.6's own markup,
// with the responses section of components/api/responses.tsx.
//
// The controls of the playground bar and of the example cards (language and status selects,
// the schema switch, copy buttons) were about 6 KB of markup per operation, written into the
// exported HTML although none of them works before hydration. Until then this renders the same
// bar and cards without them: the method and path, the example request and the example response
// as plain code, in fumadocs' own boxes, so the page keeps its layout and its text. Right after
// hydration the interactive ones replace them; their controls sit in title bars of fixed height,
// so nothing moves.

import type { ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { useComponents } from 'fumadocs-openapi';
import { useCodeUsage, useExampleRequests, useOperation, useResponseExamples } from 'fumadocs-openapi/operation';
import { ApiResponses } from '@/components/api/responses';
import { cn } from '@/lib/cn';
import { useHydrated } from '@/lib/use-hydrated';

interface OperationSlots {
  header: ReactNode;
  description: ReactNode;
  apiExample: ReactNode;
  apiPlayground: ReactNode;
  authSchemes: ReactNode;
  parameters: ReactNode;
  body: ReactNode;
  callbacks: ReactNode;
}

export function OperationLayout({ slots, method, path }: { slots: OperationSlots; method: string; path: string }) {
  const hydrated = useHydrated();
  const { operation } = useOperation();
  return (
    <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
      <div className="min-w-0 flex-1">
        {slots.header}
        {hydrated ? slots.apiPlayground : <EndpointBar method={method} route={path} deprecated={operation.deprecated} />}
        {slots.description}
        {slots.authSchemes}
        {slots.parameters}
        {slots.body}
        {/* The title is an h2 and the sections under it h3, as upstream numbers them. */}
        <ApiResponses headingLevel={slots.header ? 3 : 2} />
        {slots.callbacks}
      </div>
      <div className="@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-3,0px)+1rem)] @4xl:flex @4xl:max-h-[calc(var(--fd-docs-height,100dvh)-var(--fd-docs-row-3,0px)-2rem)] @4xl:w-[400px] @4xl:flex-col">
        {slots.apiExample}
      </div>
    </div>
  );
}

export function ExampleLayout({ slots }: { slots: { selector: ReactNode; usageTabs: ReactNode; responseTabs: ReactNode } }) {
  const hydrated = useHydrated();
  return (
    <div className="flex min-h-0 flex-col prose-no-margin">
      {slots.selector}
      {hydrated ? slots.usageTabs : <RequestExample />}
      {hydrated ? slots.responseTabs : <ResponseExample />}
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  PUT: 'text-yellow-600 dark:text-yellow-400',
  PATCH: 'text-orange-600 dark:text-orange-400',
  POST: 'text-blue-600 dark:text-blue-400',
  DELETE: 'text-red-600 dark:text-red-400',
};

/** upstream's EndpointBar: what the playground bar shows, without its "send" button */
function EndpointBar({ method, route, deprecated }: { method: string; route: string; deprecated?: boolean }) {
  const label = method.toUpperCase();
  return (
    <div className="not-prose flex min-h-11 items-center gap-3 rounded-xl border bg-fd-card p-1.5 ps-3.5 text-sm text-fd-card-foreground">
      <span className={cn('font-mono font-medium text-xs', METHOD_COLORS[label] ?? 'text-green-600 dark:text-green-400')}>{label}</span>
      <div
        className={cn(
          'flex min-w-0 items-center overflow-x-auto font-mono text-[0.8125rem] text-nowrap [scrollbar-width:none] flex-1',
          deprecated && 'line-through',
        )}
      >
        {route.split(/(\{[^}]*\}|\/)/).map((part, index) => {
          if (index % 2 === 0) return part;
          if (part === '/')
            return (
              <span key={index} className="text-fd-muted-foreground">
                /
              </span>
            );
          return (
            <span key={index} className="rounded-md bg-fd-primary/10 px-1 text-fd-primary">
              {part}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** upstream's example code block classes (exampleCodeBlock), with the card's bottom margin */
const exampleCodeBlockClassName =
  'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] [&_figcaption]:overflow-visible [&>div:has(>figcaption)]:h-10 [&_figcaption]:text-[0.8125rem] [&_figcaption]:font-medium [&_figcaption]:text-fd-foreground mb-4';

/** upstream's code block inside an example card (cardCodeBlock) */
const cardCodeBlock = {
  className: 'flex min-h-0 flex-col rounded-none border-0 bg-transparent shadow-none',
  viewportProps: { className: 'min-h-0' },
  allowCopy: false,
};

/** the example request in the default language, as upstream's first render shows it */
function RequestExample() {
  const t = useTranslations({ note: 'operation page' });
  const { operation, codeUsages } = useOperation();
  const { CodeBlock } = useComponents();
  const examples = useExampleRequests();
  const generators = codeUsages.map();
  const id: string | undefined = generators.keys().next().value;
  const code = useCodeUsage(id ?? '');
  if (id === undefined) return null;
  const selectable = !(operation as { 'x-exclusiveCodeSample'?: unknown })['x-exclusiveCodeSample'];
  const example = selectable && examples.items.length > 1 ? examples.items.find((item) => item.id === examples.selected) : undefined;
  return (
    <CodeBlock
      lang={generators.get(id)!.lang}
      code={code ?? ''}
      codeblock={{
        title: example ? <span className="truncate">{example.name}</span> : t('Example Request'),
        className: exampleCodeBlockClassName,
        allowCopy: false,
      }}
    />
  );
}

/** the first status's first example, as upstream's first render shows it */
function ResponseExample() {
  const t = useTranslations({ note: 'operation page' });
  const tabs = useResponseExamples();
  const { Markdown, CodeBlock } = useComponents();
  if (tabs.length === 0) return null;
  const examples = tabs[0].examples ?? [];
  const example = examples[0];
  let body: ReactNode;
  if (example) {
    const captioned = examples.length > 1 || example.description !== undefined;
    body = (
      <>
        {captioned && (
          <div className="shrink-0 px-4 pt-2.5">
            {/* the height of the example select it stands for */}
            {examples.length > 1 && <span className="flex h-7 items-center text-[0.8125rem] font-medium">{example.label}</span>}
            {example.description && (
              <div className="prose prose-xs prose-no-margin text-fd-muted-foreground">
                <Markdown md={example.description} />
              </div>
            )}
          </div>
        )}
        <CodeBlock
          lang="json"
          code={JSON.stringify(example.sample, null, 2)}
          codeblock={captioned ? { ...cardCodeBlock, viewportProps: { className: 'min-h-0 pt-2' } } : cardCodeBlock}
        />
      </>
    );
  } else {
    body = <div className="px-4 py-3 text-sm text-fd-muted-foreground">{t('Empty')}</div>;
  }
  return (
    <div className="mb-4 flex min-h-0 flex-col overflow-hidden rounded-xl border bg-fd-card">
      <div className="shrink-0 border-b ps-4 pe-2 text-fd-muted-foreground">
        <div className="flex h-[calc(--spacing(10)-1px)] items-center text-[0.8125rem] font-medium">
          <span className="me-auto truncate text-fd-foreground">{t('Example Response')}</span>
        </div>
      </div>
      {body}
    </div>
  );
}
