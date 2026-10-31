import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { Provider } from '@/components/provider';
import { DocsNav } from '@/components/docs-nav';
import { appName, ogImage, siteOrigin } from '@/lib/shared';
import '@/app/global.css';
// Reused portal styling (nav design + theme tokens), copied into this tree by
// scripts/sync-portal-ui.mjs so the navbar matches dev.cosmospay.lat exactly.
import '@/styles/cosmos.css';

// Every page sets its own title, description, canonical, hreflang and Open Graph
// (generateMetadata in (docs)/[[...slug]]/page.tsx, built by lib/seo.ts); these are the defaults
// and the base the relative ones resolve against.
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { template: `%s | ${appName}`, default: appName },
  openGraph: { siteName: appName, type: 'website', images: [ogImage] },
  twitter: { card: 'summary_large_image', images: [ogImage.url] },
};

// The text face is the portal's Open Sauce One (cosmos.css sets it on <body>, its @font-face
// files are the portal's /fonts/, same origin). Preload the weights the first screen uses, so
// the text does not render in the fallback first and reflow when the font swaps in.
const PRELOADED_FONTS = ['OpenSauceOne-Regular', 'OpenSauceOne-Medium', 'OpenSauceOne-SemiBold'];

export default function Layout({ children }: LayoutProps<'/'>) {
  // next-themes (configured in Provider) injects its own pre-paint script and manages both
  // the `.dark` class and `data-theme` attribute, so no manual theme script is needed here.
  // `lang` is the default language's: scripts/set-html-lang.mjs rewrites it in the exported
  // pages under a locale prefix, and the Provider keeps it in step on client navigation.
  for (const font of PRELOADED_FONTS) {
    preload(`/fonts/${font}.woff2`, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>
          <DocsNav />
          {children}
        </Provider>
      </body>
    </html>
  );
}
