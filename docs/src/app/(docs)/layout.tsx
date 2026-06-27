// The Fumadocs <DocsLayout> (sidebar + page tree) is rendered inside the page itself, not
// here, because the tree is per-locale and only the page route knows the active language
// (this is a static export, so there's no middleware to inject it). This group layout is
// just a passthrough.
export default function Layout({ children }: LayoutProps<'/'>) {
  return children;
}
