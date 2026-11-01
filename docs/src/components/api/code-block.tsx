'use client';
// The code blocks of the API reference (example requests and responses, code in descriptions),
// passed to createOpenAPIPage() as `components.CodeBlock`.
//
// Fumadocs' default highlights inside a Suspense boundary whose fallback is the plain code. Shiki
// loads asynchronously, so the static export wrote every block twice: the plain fallback in place,
// then the highlighted copy at the end of the body in a hidden <div> with a script that swaps it
// in (about 10 KB per operation). Here the server HTML and the hydration render the plain block
// (the same markup as that fallback: the code is in the page as text) and the browser highlights
// it right after hydration, with the page's own highlighter.

import { useMemo } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { createDynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock.core';
import { useRenderContext, type CodeBlockProps } from 'fumadocs-openapi';
import { cn } from '@/lib/cn';
import { useHydrated } from '@/lib/use-hydrated';

export function ApiCodeBlock(props: CodeBlockProps) {
  const { highlighter } = useRenderContext();
  const Highlighted = useMemo(() => createDynamicCodeBlock({ highlighter }), [highlighter]);
  const hydrated = useHydrated();
  if (hydrated) return <Highlighted {...props} />;

  const { code, codeblock } = props;
  return (
    <CodeBlock {...codeblock} className={cn('my-0', codeblock?.className)}>
      <Pre>
        <code>
          {code.split('\n').map((line, i) => (
            <span key={i} className="line">
              {line}
            </span>
          ))}
        </code>
      </Pre>
    </CodeBlock>
  );
}
