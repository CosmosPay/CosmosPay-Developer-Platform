'use client';
// The shared Cosmos Pay navbar, reused verbatim from the portal (../src). Because the docs
// are served from the same origin as the portal, the better-auth session cookie is shared,
// so we can read the signed-in user client-side with getSession(). Theme is kept in sync
// with both the portal's `data-theme` attribute (cosmos.css) and Fumadocs' `.dark` class.
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Nav } from '@/components/cosmos/layout/Nav';
import type { Theme, User } from '@/components/cosmos/lib/types';
import { getSession } from '@/lib/auth-client';

function applyTheme(t: Theme) {
  try {
    localStorage.setItem('cosmospay-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  } catch {
    /* ignore (SSR / storage disabled) */
  }
}

export function DocsNav() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = (localStorage.getItem('cosmospay-theme') as Theme) || 'light';
    setThemeState(stored);

    let active = true;
    getSession()
      .then((res) => {
        const u = res?.data?.user;
        if (active && u) setUser({ name: u.name, email: u.email, image: u.image });
      })
      .catch(() => {
        /* not signed in / endpoint unavailable in isolated docs dev */
      });
    return () => {
      active = false;
    };
  }, []);

  const setTheme: Dispatch<SetStateAction<Theme>> = (value) => {
    setThemeState((prev) => {
      const next = typeof value === 'function' ? (value as (p: Theme) => Theme)(prev) : value;
      applyTheme(next);
      return next;
    });
  };

  return <Nav theme={theme} setTheme={setTheme} user={user} />;
}
