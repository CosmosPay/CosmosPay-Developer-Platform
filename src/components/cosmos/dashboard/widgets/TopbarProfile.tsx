import { useState } from "react";
import { Avatar } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { useOutside } from "../hooks";
import { AccountMenuItems } from "./AccountMenuItems";

/* Topbar avatar dropdown — same options as the sidebar profile menu. */
export function TopbarProfile({ user, onAccount }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const name = user?.name || "Account";
  const email = user?.email || "";
  const pm = t.dash.profileMenu;
  const goSettings = () => { setOpen(false); onAccount && onAccount(); };
  return (
    <div className="nav-user" ref={ref}>
      <button className={`nav-user-btn${open ? " on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={name}>
        <Avatar user={user} size={38} />
      </button>
      {open && (
        <div className="nav-user-menu prof-menu-top" role="menu">
          <div className="nav-user-head">
            <Avatar user={user} size={38} />
            <div className="nav-user-id"><b>{name}</b>{email && <span>{email}</span>}</div>
          </div>
          <AccountMenuItems pm={pm} onAccount={goSettings} onBilling={goSettings} />
        </div>
      )}
    </div>
  );
}
