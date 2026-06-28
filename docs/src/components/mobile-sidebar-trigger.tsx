'use client';
import { useDocsLayout } from 'fumadocs-ui/layouts/docs';

// The Fumadocs sidebar is hidden below `md` and normally opened from a trigger in the top nav —
// which we disable in favour of the Cosmos navbar. So on mobile there was no way to open it.
// This renders the layout's own sidebar trigger (toggles the mobile drawer) in a sticky bar
// under the navbar, shown only on mobile. It must live INSIDE <DocsLayout> (rendered in the
// page) so the layout/sidebar context is available.
export function MobileSidebarTrigger() {
  const { slots } = useDocsLayout();
  const Trigger = slots.sidebar.trigger;

  return (
    <div
      className="md:hidden sticky z-20 -mt-2 mb-4 flex items-center"
      style={{ top: 'var(--fd-nav-height)' }}
    >
      <Trigger
        aria-label="Open documentation menu"
        className="inline-flex items-center gap-2 rounded-lg border bg-fd-card px-3 py-2 text-sm font-medium text-fd-foreground shadow-sm transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Menu
      </Trigger>
    </div>
  );
}
