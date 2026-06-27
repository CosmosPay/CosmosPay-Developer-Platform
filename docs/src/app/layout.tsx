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

// Apply the persisted theme before paint to avoid a flash (mirrors the portal's CosmosLayout).
const themeScript = `try{var t=localStorage.getItem('cosmospay-theme')||'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}`;

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
