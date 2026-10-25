import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useT } from "@/lib/i18n/index";
import { CosmosLockup } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { SIDE } from "@/components/cosmos/dashboard/data";

/* The dashboard's sidebar, strictly after the product owner's gateway-dashboard reference:
   the logo, a main menu and a preferences section split by a hairline, each entry an outline
   icon and a label; a group opens into its views as a tree (the current one marked by a dot
   on its branch). Entries are links to ?view= (the shell keeps the URL in step), so they open
   in a new tab too; a plain click switches the view in place. `visible` hides what the
   viewer's role may not see; a group left with one view is drawn as that one entry. */

const GROUP_ICON: Record<string, string> = {
  payments: "payments", swaps: "swaps", developers: "developers", settings: "settings", help: "help", admin: "adminOverview",
};

type Props = {
  view: string;
  go: (view: string) => void;
  visible: (view: string) => boolean;
  unread: number;
  supportUnread: number;
};

export function Sidebar({ view, go, visible, unread, supportUnread }: Props) {
  const t = useT();
  const s = t.dash.sidebar;
  const groupOf = (v: string) => {
    for (const sec of SIDE) for (const e of sec.entries) if ("group" in e && e.views.includes(v)) return e.group;
    return null;
  };
  const [open, setOpen] = useState<Set<string>>(() => new Set([groupOf(view)].filter(Boolean) as string[]));
  // The current view's group opens by itself (a deep link, a view picked elsewhere).
  useEffect(() => {
    const g = groupOf(view);
    if (g) setOpen((o) => (o.has(g) ? o : new Set([...o, g])));
  }, [view]);
  const toggle = (g: string) => setOpen((o) => { const n = new Set(o); if (n.has(g)) n.delete(g); else n.add(g); return n; });

  const label = (v: string) => (v === "activity" ? s.notifications : s.items[v]);
  const icon = (v: string) => (v === "activity" ? DI.bell : DI[v]);
  const badge = (v: string) => {
    if (v === "activity" && unread > 0) return <span className="side-count">{unread}</span>;
    if (v === "support" && supportUnread > 0) return <span className="side-dot" aria-hidden="true" />;
    return null;
  };
  // A link to the view; a plain left click switches in place, a modified one opens a tab.
  const follow = (v: string) => (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(v);
  };
  const href = (v: string) => (v === "overview" ? "/dashboard" : `/dashboard?view=${v}`);
  const link = (v: string, text: string, glyph: ReactNode, cls = "side-link") => (
    <a className={`${cls}${view === v ? " active" : ""}`} href={href(v)} aria-current={view === v ? "page" : undefined} onClick={follow(v)}>
      {glyph}<span className="side-label">{text}</span>{badge(v)}
    </a>
  );

  return (
    <>
      <a className="side-logo" href="/dashboard" onClick={follow("overview")}><CosmosLockup height={34} label="Cosmos Pay" /></a>
      <nav className="side-nav" aria-label={s.label}>
        {SIDE.map((sec) => {
          const entries = sec.entries
            .map((e) => ("group" in e ? { ...e, views: e.views.filter(visible) } : e))
            .filter((e) => ("group" in e ? e.views.length > 0 : visible(e.view)));
          if (!entries.length) return null;
          const title = sec.sec === "Admin" ? s.sections.Admin : s.menu[sec.sec];
          return (
            <div className="side-sec-wrap" key={sec.sec}>
              <p className="side-sec" id={`side-sec-${sec.sec}`}>{title}</p>
              <ul className="side-list" role="list" aria-labelledby={`side-sec-${sec.sec}`}>
                {entries.map((e) => {
                  if (!("group" in e)) return <li key={e.view}>{link(e.view, label(e.view), icon(e.view))}</li>;
                  const glyph = DI[GROUP_ICON[e.group]];
                  // One view left for this viewer: the group is that view, under the group's name.
                  if (e.views.length === 1) return <li key={e.group}>{link(e.views[0], s.groups[e.group], glyph)}</li>;
                  const isOpen = open.has(e.group);
                  const here = e.views.includes(view);
                  const anyBadge = e.views.some((v) => (v === "support" && supportUnread > 0));
                  return (
                    <li key={e.group} className={`side-group${isOpen ? " open" : ""}`}>
                      <button type="button" className={`side-link side-group-btn${here ? " here" : ""}`} aria-expanded={isOpen} aria-controls={`side-g-${e.group}`} onClick={() => toggle(e.group)}>
                        {glyph}<span className="side-label">{s.groups[e.group]}</span>
                        {!isOpen && anyBadge && <span className="side-dot" aria-hidden="true" />}
                        <span className="side-chev" aria-hidden="true">{DI.chevD}</span>
                      </button>
                      <ul className="side-tree" id={`side-g-${e.group}`} role="list" hidden={!isOpen}>
                        {e.views.map((v) => <li key={v}>{link(v, label(v), null, "side-link side-sub")}</li>)}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </>
  );
}
