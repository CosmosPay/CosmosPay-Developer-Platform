import { useState } from "react";
import { useT } from "@/lib/i18n/index";
import { initials } from "@/components/cosmos/dashboard/helpers";
import { useOutside } from "@/components/cosmos/dashboard/hooks";
import { AccountMenuItems } from "./AccountMenuItems";

export function ProfileMenu({ user, onAccount }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const name = user?.name || "Account";
  const email = user?.email || "";
  const pm = t.dash.profileMenu;
  const goSettings = () => { setOpen(false); onAccount && onAccount(); };
  return (
    <div className="prof-wrap" ref={ref}>
      <button className="side-foot" aria-haspopup="menu" aria-expanded={open} aria-label={name} onClick={() => setOpen((o) => !o)}>
        <div className="av">{initials(name)}</div><div className="who lbl"><b>{name}</b><span>{email}</span></div>
        <svg className="prof-chev lbl" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
      </button>
      {open && (<div className="prof-menu">
        <div className="prof-head"><b>{name}</b><span>{email}</span></div>
        <AccountMenuItems pm={pm} onAccount={goSettings} onBilling={goSettings} />
      </div>)}
    </div>
  );
}
