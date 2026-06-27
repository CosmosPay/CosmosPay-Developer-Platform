'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { type ReactNode } from 'react';

export function Provider({ children }: { children: ReactNode }) {
  // Disable next-themes: the shared Cosmos navbar owns theming via the `data-theme`
  // attribute + `.dark` class (see DocsNav / the pre-paint script in the root layout),
  // so there's a single source of truth instead of two competing theme systems.
  return (
    <RootProvider theme={{ enabled: false }} search={{ SearchDialog }}>
      {children}
    </RootProvider>
  );
}
