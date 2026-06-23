import { useState } from "react";
import { IcCheck } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { DI, IcLock } from "../icons";
import { initials } from "../helpers";
import { useOutside } from "../hooks";

export function OrgSwitcher({ orgs, current, onSwitch, onCreate, lockedIds }) {
  const t = useT();
  const og = t.dash.org;
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const owned = orgs.filter((o) => o.role === "owner");
  const invited = orgs.filter((o) => o.role !== "owner");
  const isLocked = (o) => !!(lockedIds && lockedIds.has(o.id));
  const renderOpt = (o) => {
    const locked = isLocked(o);
    return (
      <button key={o.id} className={`org-opt${o.id === current.id ? " active" : ""}${locked ? " locked" : ""}`} disabled={locked} title={locked ? og.locked : undefined} onClick={() => { if (!locked) { onSwitch(o.id); setOpen(false); } }}>
        <span className="org-av sm">{initials(o.name)}</span><span className="org-opt-nm">{o.name}</span>
        {locked ? <span className="org-lock"><IcLock /></span> : (o.id === current.id && <span className="org-check"><IcCheck /></span>)}
      </button>
    );
  };
  return (
    <div className="org-wrap" ref={ref}>
      <button className={`org-switch${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)}>
        <span className="org-av">{initials(current.name)}</span><span className="org-nm lbl">{current.name}</span>
        <svg className="org-chev lbl" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
      </button>
      {open && (<div className="org-menu">
        <div className="org-menu-h">{og.owned}</div>
        {owned.map(renderOpt)}
        {invited.length > 0 && (<><div className="org-menu-h">{og.invited}</div>{invited.map(renderOpt)}</>)}
        <button className="org-create" onClick={() => { setOpen(false); onCreate(); }}>{DI.plus} {og.create}</button>
      </div>)}
    </div>
  );
}
