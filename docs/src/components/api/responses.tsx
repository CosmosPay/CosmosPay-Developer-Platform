'use client';
// The "Response Body" section of an API operation, in place of fumadocs-openapi's
// (`renderOperationLayout` in components/api-page.tsx).
//
// Upstream renders the first status's whole schema into the page and the other statuses only
// when their tab is picked. That schema was the heaviest part of most pages (a full card per
// operation, about a third of the KYC page). Here every status the operation answers is a row
// with its description, all of them in the server HTML (upstream had only the first one's), and
// a status's schema mounts when its code is pressed: the same Schema UI card as upstream, with
// its media type and "TypeScript" action. The fields stay readable without JavaScript in the
// page's Markdown (/docs/api/<tag>.md, llms-full.txt), which lists each response's fields
// (lib/openapi-markdown.ts). A link into a response (`#response.<status>...`, what the copy-link
// buttons of its properties produce) opens that status.

import { useCallback, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { slug } from 'github-slugger';
import { useTranslations } from '@fuma-translate/react';
import { useComponents, useOpenAPI, useRenderContext } from 'fumadocs-openapi';
import { useOperation, type OperationResponse } from 'fumadocs-openapi/operation';
import { CopyTypeScript } from '@/components/api/schema-ui';

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** the URL hash, decoded as the browser does to find its target */
function currentHash(): string {
  const hash = window.location.hash.slice(1);
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

/** Whether the URL hash is `id` or an anchor inside it. */
function useLinkedInto(id: string): boolean {
  return useSyncExternalStore(
    subscribeHash,
    () => {
      const hash = currentHash();
      return hash === id || hash.startsWith(`${id}.`);
    },
    () => false,
  );
}

/** `api-s2` for 2xx, `api-s4` for 4xx...: the colour of the status code (global.css). */
function statusClass(status: string): string {
  return /^[1-5]/.test(status) ? ` api-s${status[0]}` : '';
}

export function ApiResponses({ headingLevel }: { headingLevel: number }) {
  const t = useTranslations({ note: 'operation page' });
  const { responses } = useOperation();
  const { Heading } = useComponents();
  if (responses.length === 0) return null;
  return (
    <div className="mt-10 first:mt-0">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Heading id="response-body" depth={headingLevel} className="my-0! me-auto">
          {t('Response Body')}
        </Heading>
      </div>
      <div className="api-resps">
        {responses.map((item) => (
          <ResponseRow key={item.status} item={item} />
        ))}
      </div>
    </div>
  );
}

function ResponseRow({ item: { status, response, content } }: { item: OperationResponse }) {
  const t = useTranslations({ note: 'operation page' });
  const { Markdown } = useComponents();
  const anchor = `response.${slug(status)}`;
  const linked = useLinkedInto(anchor);
  // null until the reader toggles it: the row follows the URL hash until then.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? linked;
  const media = Object.entries(content);
  // Unique on the page: the anchors repeat from one operation to the next, as upstream's do.
  const panelId = useId();

  // A link into this response could not scroll on load (the schema was not rendered yet).
  const reveal = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !linked) return;
      const target = document.getElementById(currentHash());
      if (target && element.contains(target)) target.scrollIntoView();
    },
    [linked],
  );

  return (
    <div className="api-resp">
      {media.length > 0 ? (
        <button
          type="button"
          className={`api-resp-code${statusClass(status)}`}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`${status}: ${t('Schema')}`}
          onClick={() => setToggled(!open)}
        >
          {status}
        </button>
      ) : (
        <span className={`api-resp-code${statusClass(status)}`}>{status}</span>
      )}
      <div className="api-resp-desc prose-no-margin">{response.description && <Markdown md={response.description} />}</div>
      {open && (
        <div id={panelId} ref={reveal} className="api-resp-body">
          {media.map(([mediaType, value]) => (
            <ResponseSchema key={mediaType} status={status} mediaType={mediaType} schema={value.schema} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResponseSchema({ status, mediaType, schema }: { status: string; mediaType: string; schema: unknown }) {
  const { SchemaUI, Markdown, CodeBlock } = useComponents();
  const { doc, generateTypeScriptDefinitions } = useOpenAPI();
  const { schemaUI } = useRenderContext();
  const renderers = useMemo(
    () => ({
      renderMarkdown: (md: string) => <Markdown md={md} />,
      renderCodeblock: (props: { lang: string; code: string }) => <CodeBlock {...props} />,
    }),
    [Markdown, CodeBlock],
  );
  const selector = (
    <span className="min-w-0 px-1.5 font-medium">
      <code>{mediaType}</code>
    </span>
  );
  if (schema === undefined)
    return (
      <div className="not-prose flex h-9 items-center rounded-xl border bg-fd-card ps-1.5 pe-1 text-[0.8125rem]">{selector}</div>
    );
  return (
    <SchemaUI
      {...renderers}
      showExample={schemaUI?.showExample}
      root={schema as Parameters<typeof SchemaUI>[0]['root']}
      readOnly
      writeOnly={false}
      client={{
        name: 'response',
        as: 'body',
        // The anchor fumadocs gives a response's schema: response.<status>.<media type>.response
        rootId: `response.${slug(status)}.${slug(mediaType)}.response`,
        selector,
        actions: generateTypeScriptDefinitions && (
          <CopyTypeScript
            name="response body"
            generate={() =>
              generateTypeScriptDefinitions(schema as Parameters<typeof generateTypeScriptDefinitions>[0], {
                name: 'ResponseBody',
                readOnly: true,
                writeOnly: false,
                doc,
              })
            }
          />
        ),
      }}
    />
  );
}
