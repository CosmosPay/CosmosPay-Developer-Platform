import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    // The global Cosmos navbar is rendered in the root layout, so disable Fumadocs' own
    // top nav. The sidebar/TOC are offset below it via `--fd-nav-height` (set in global.css).
    <DocsLayout tree={source.getPageTree()} {...baseOptions()} nav={{ enabled: false }}>
      {children}
    </DocsLayout>
  );
}
