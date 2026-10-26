import { useState } from "react";
import { useT } from "@/lib/i18n/index";
import type { User } from "@/components/cosmos/lib/types";
import { DASH, DOCS } from "@/components/cosmos/lib/constants";
import { startLogout } from "@/components/cosmos/lib/auth";
import { useOutside } from "@/components/cosmos/hooks/useOutside";
import { usePresence } from "@/components/cosmos/hooks/usePresence";
import { Avatar } from "@/components/cosmos/ui/Avatar";
import { IcGauge, IcUser, IcDocs, IcLogout } from "@/components/cosmos/icons";

/* Signed-in account dropdown for the general nav. Its account item opens the personal account
   page; inside the dashboard (`onAccount`) it switches to that view in place, and the dashboard
   item, which would lead to the page already open, is left out. */
export function NavUserMenu({ user, onAccount }: { user: User; onAccount?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { mounted, state } = usePresence(open, 120);
  const ref = useOutside(() => setOpen(false));
  const name = (user && user.name) || t.ui.account;
  const email = (user && user.email) || "";
  return (
    <div className="nav-user" ref={ref}>
      <button className={`nav-user-btn${open ? " on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={name}>
        <Avatar user={user} size={36} />
      </button>
      {mounted && (
        <div className="nav-user-menu" role="menu" data-state={state}>
          <div className="nav-user-head">
            <Avatar user={user} size={38} />
            <div className="nav-user-id"><b>{name}</b>{email && <span>{email}</span>}</div>
          </div>
          {!onAccount && <a className="nav-user-opt" href={DASH} role="menuitem"><IcGauge /> {t.nav.dashboard}</a>}
          <a
            className="nav-user-opt" href={`${DASH}?view=account`} role="menuitem"
            onClick={(e) => {
              if (!onAccount || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              setOpen(false);
              onAccount();
            }}
          ><IcUser /> {t.profile.account}</a>
          <a className="nav-user-opt" href={DOCS} role="menuitem"><IcDocs /> {t.profile.docs}</a>
          <button className="nav-user-opt danger" onClick={() => startLogout()} role="menuitem"><IcLogout /> {t.profile.logout}</button>
        </div>
      )}
    </div>
  );
}
