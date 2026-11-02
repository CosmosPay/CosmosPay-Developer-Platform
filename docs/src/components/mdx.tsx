import type { ComponentPropsWithoutRef } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Heading } from '@/components/heading';
import { Card, Cards } from '@/components/card';

type HeadingElementProps = ComponentPropsWithoutRef<'h1'>;

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // Fumadocs' headings with an icon-only copy-link button, so a heading's text is its title
    // alone (components/heading.tsx).
    h1: (props: HeadingElementProps) => <Heading as="h1" {...props} />,
    h2: (props: HeadingElementProps) => <Heading as="h2" {...props} />,
    h3: (props: HeadingElementProps) => <Heading as="h3" {...props} />,
    h4: (props: HeadingElementProps) => <Heading as="h4" {...props} />,
    h5: (props: HeadingElementProps) => <Heading as="h5" {...props} />,
    h6: (props: HeadingElementProps) => <Heading as="h6" {...props} />,
    // Card titles are text, not <h3> (components/card.tsx).
    Card,
    Cards,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
