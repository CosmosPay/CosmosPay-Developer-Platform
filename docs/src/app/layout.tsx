import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import { DocsNav } from '@/components/docs-nav';
import './global.css';
// Reused portal styling (nav design + theme tokens), copied into this tree by
// scripts/sync-portal-ui.mjs so the navbar matches dev.cosmospay.lat exactly.
import '../styles/cosmos.css';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  // next-themes (configured in Provider) injects its own pre-paint script and manages both
  // the `.dark` class and `data-theme` attribute, so no manual theme script is needed here.
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <Provider>
          <DocsNav />
          {children}
        </Provider>
      </body>
    </html>
  );
}
