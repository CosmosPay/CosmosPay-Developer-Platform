'use client';
// The shared Cosmos Pay navbar, reused verbatim from the portal (../src). Because the docs
// are served from the same origin as the portal, the better-auth session cookie is shared,
// so we read the signed-in user client-side with getSession(). Theme is driven by next-themes
// (configured in Provider to write both `.dark` and `data-theme`), so this toggle and the
// Fumadocs sidebar toggle stay in sync.
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useTheme } from 'next-themes';
import { Nav } from '@/components/cosmos/layout/Nav';
import type { Theme, User } from '@/components/cosmos/lib/types';
import { getSession } from '@/lib/auth-client';

export function DocsNav() {
  const [user, setUser] = useState<User | null>(null);
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();

  useEffect(() => {
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

  const theme: Theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const setTheme: Dispatch<SetStateAction<Theme>> = (value) => {
    const next = typeof value === 'function' ? (value as (p: Theme) => Theme)(theme) : value;
    setNextTheme(next);
  };

  return <Nav theme={theme} setTheme={setTheme} user={user} />;
}
