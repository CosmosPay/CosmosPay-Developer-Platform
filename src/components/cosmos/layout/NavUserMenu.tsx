import { useState } from "react";
import { useT } from "@/lib/i18n/index";
import type { User } from "../lib/types";
import { DASH } from "../lib/constants";
import { startLogout } from "../lib/auth";
import { useOutside } from "../hooks/useOutside";
import { Avatar } from "../ui/Avatar";
import { IcGauge, IcUser, IcDocs, IcLogout } from "../icons";

/* Signed-in account dropdown for the marketing nav. */
export function NavUserMenu({ user }: { user: User }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const name = (user && user.name) || "Account";
  const email = (user && user.email) || "";
  return (
    <div className="nav-user" ref={ref}>
      <button className={`nav-user-btn${open ? " on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={name}>
        <Avatar user={user} size={36} />
      </button>
      {open && (
        <div className="nav-user-menu" role="menu">
          <div className="nav-user-head">
            <Avatar user={user} size={38} />
            <div className="nav-user-id"><b>{name}</b>{email && <span>{email}</span>}</div>
          </div>
          <a className="nav-user-opt" href={DASH} role="menuitem"><IcGauge /> {t.nav.dashboard}</a>
          <a className="nav-user-opt" href={`${DASH}?view=settings`} role="menuitem"><IcUser /> {t.profile.account}</a>
          <a className="nav-user-opt" href="/docs" role="menuitem"><IcDocs /> {t.profile.docs}</a>
          <button className="nav-user-opt danger" onClick={() => startLogout()} role="menuitem"><IcLogout /> {t.profile.logout}</button>
        </div>
      )}
    </div>
  );
}
