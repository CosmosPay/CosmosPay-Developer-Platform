import { useState } from "react";
import { useT } from "@/lib/i18n/index";
import { DI } from "../icons";
import { fmtDateTime, notifIp, deviceLabel } from "../helpers";
import { useOutside } from "../hooks";

/* Activity notifications dropdown (bell). Fetches on first open; localizes by type. */
export function NotificationsMenu({ items, loading, error, unread = 0, onOpen, onViewAll }) {
  const t = useT();
  const nt = t.dash.notifications;
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const list = (items || []).slice(0, 8);
  const toggle = () => { const n = !open; setOpen(n); if (n && unread > 0 && onOpen) onOpen(); };
  return (
    <div className="nav-user" ref={ref}>
      <button className={`icon-btn notif-bell${unread > 0 ? " has-unread" : ""}`} title={nt.title} onClick={toggle}>{DI.bell}{unread > 0 && <span className="notif-dot" />}</button>
      {open && (
        <div className="nav-user-menu notif-menu" role="menu">
          <div className="notif-head">{nt.title}</div>
          {error && <div className="notif-empty">{nt.loadError}</div>}
          {!error && loading && <div className="notif-empty">…</div>}
          {!error && !loading && !list.length && <div className="notif-empty">{nt.empty}</div>}
          {!error && list.map((n) => (
            <div className="notif-item" key={n.id}>
              <div className="notif-title">{(nt.types && nt.types[n.type]) || n.title}</div>
              {n.message && <div className="notif-msg">{n.message}</div>}
              <div className="notif-meta">{[n.origin, fmtDateTime(n.createdAt)].filter(Boolean).join(" · ")}</div>
              {(notifIp(n) || deviceLabel(n)) && <div className="notif-meta">{[notifIp(n), deviceLabel(n)].filter(Boolean).join(" · ")}</div>}
            </div>
          ))}
          {onViewAll && (items && items.length > 0) && (
            <button className="notif-all" onClick={() => { setOpen(false); onViewAll(); }}>{nt.viewAll}</button>
          )}
        </div>
      )}
    </div>
  );
}
