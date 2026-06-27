import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 .5A12 12 0 0 0 0 12.7c0 5.4 3.4 10 8.2 11.6.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.3 1.8 1.3 1.1 1.9 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6 0-1.3.5-2.4 1.3-3.2 0-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.7 1.6.1 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 24 12.7 12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    // The Cosmos navbar already has a theme toggle (and it stays in sync with the sidebar via
    // next-themes), so hide Fumadocs' own theme switch from the sidebar to avoid a duplicate.
    themeSwitch: { enabled: false },
    // Likewise hide Fumadocs' own sidebar language selector: the navbar LangSelect is the one
    // switcher, and the Fumadocs one navigated to `/<lang>` (e.g. `/en/...`) which 404s under
    // our `hideLocale:'default-locale'` scheme (en is unprefixed). `i18n:false` only turns off
    // that UI control — content/chrome localization (RootProvider i18n) is unaffected.
    i18n: false,
    // Show the repository name next to the GitHub icon (instead of just the bare icon that
    // `githubUrl` renders). Appears in the sidebar since the top nav is disabled.
    links: [
      {
        type: 'main',
        text: `${gitConfig.user}/${gitConfig.repo}`,
        url: repoUrl,
        external: true,
        icon: <GithubIcon />,
      },
    ],
  };
}
