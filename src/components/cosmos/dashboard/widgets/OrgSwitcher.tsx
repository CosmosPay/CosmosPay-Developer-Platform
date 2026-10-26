import { useState } from "react";
import { IcCheck } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { DI, IcLock } from "@/components/cosmos/dashboard/icons";
import { initials } from "@/components/cosmos/dashboard/helpers";
import { useOutside, usePresence } from "@/components/cosmos/dashboard/hooks";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";

/* `variant="crumb"`: the organization as the grey half of the page title's breadcrumb (the
   reference's "Gateways → Gateways Profile"), opening the same menu. */
/* A locked organization (past the account plan's limit) opens the plan dialog when the viewer can
   change plan (`onUpgrade`); otherwise it stays a disabled row that says why. */
export function OrgSwitcher({ orgs, current, onSwitch, onCreate, lockedIds, variant, onUpgrade }: { orgs: any[]; current: any; onSwitch: (id: string) => void; onCreate: () => void; lockedIds?: Set<string>; variant?: "crumb"; onUpgrade?: (() => void) | null }) {
  const t = useT();
  const og = t.dash.org;
  const [open, setOpen] = useState(false);
  const menu = usePresence(open, 120);
  const ref = useOutside(() => setOpen(false));
  const owned = orgs.filter((o) => o.role === "owner");
  const invited = orgs.filter((o) => o.role !== "owner");
  const isLocked = (o) => !!(lockedIds && lockedIds.has(o.id));
  const renderOpt = (o) => {
    const locked = isLocked(o);
    return (
      <button key={o.id} className={`org-opt${o.id === current.id ? " active" : ""}${locked ? " locked" : ""}`} disabled={locked && !onUpgrade} title={locked ? og.locked : undefined} onClick={() => { setOpen(false); if (!locked) onSwitch(o.id); else if (onUpgrade) onUpgrade(); }}>
        <span className="org-av sm">{initials(o.name)}</span><span className="org-opt-nm">{o.name}</span>
        {locked ? <span className="org-lock"><IcLock /></span> : (o.id === current.id && <span className="org-check"><IcCheck /></span>)}
      </button>
    );
  };
  return (
    <div className={`org-wrap${variant === "crumb" ? " crumb" : ""}`} ref={ref}>
      {variant === "crumb" ? (
        <button type="button" className={`org-crumb${open ? " open" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label={`${og.heading}: ${current.name}`} onClick={() => setOpen((o) => !o)}>
          {/* Until the organizations arrive the crumb holds a skeleton, not an ellipsis. */}
          {current.id ? <span className="org-crumb-nm">{current.name}</span> : <Sk className="lg" w="8em" />}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      ) : (
        <button className={`org-switch${open ? " open" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label={current.name} onClick={() => setOpen((o) => !o)}>
          <span className="org-av">{initials(current.name)}</span><span className="org-nm lbl">{current.name}</span>
          <svg className="org-chev lbl" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
        </button>
      )}
      {menu.mounted && (<div className="org-menu" data-state={menu.state}>
        <div className="org-menu-h">{og.owned}</div>
        {owned.map(renderOpt)}
        {invited.length > 0 && (<><div className="org-menu-h">{og.invited}</div>{invited.map(renderOpt)}</>)}
        <button className="org-create" onClick={() => { setOpen(false); onCreate(); }}>{DI.plus} {og.create}</button>
      </div>)}
    </div>
  );
}
