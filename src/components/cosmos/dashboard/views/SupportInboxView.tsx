import { useState, useEffect } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { supportAdmin as supportAdminApi } from "@/lib/api-client";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/support-status";
import { humanizeLocal, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePolling } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ChatPanel } from "@/components/cosmos/dashboard/components/ChatPanel";
import { TicketStatusPill, TicketPriorityTag } from "@/components/cosmos/dashboard/components/TicketStatusPill";
import { MiniSelect } from "@/components/cosmos/dashboard/components/MiniSelect";

/* Staff support inbox — every customer ticket, filterable by status, with a reply pane
   and a status selector to move tickets through open → pending → resolved → closed. */
export function SupportInboxView() {
  const t = useT();
  const s = t.dash.support;
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [ticket, setTicket] = useState(null);

  const loadTickets = () => supportAdminApi.tickets(filter === "all" ? undefined : filter).then((d) => setTickets(Array.isArray(d) ? d : [])).catch(() => {});
  const loadTicket = (id) => supportAdminApi.ticket(id).then((d) => setTicket(d || null)).catch(() => {});
  usePolling(loadTickets, 12000);
  usePolling(() => { if (sel) loadTicket(sel); }, 10000);
  useEffect(() => { loadTickets(); }, [filter]);

  // Opening a ticket marks it read server-side; clear its unread badge immediately too.
  const open = (id) => { setSel(id); setTickets((ts) => ts.map((tk) => (tk.id === id ? { ...tk, unread: 0 } : tk))); loadTicket(id).then(loadTickets); };
  // "Online" when active in the last 3 minutes, otherwise a "last seen" timestamp.
  const lastSeenLabel = (ts) => {
    if (!ts) return "";
    return Date.now() - new Date(ts).getTime() < 3 * 60 * 1000 ? s.online : fmt(s.lastSeen, { when: fmtWhen(ts) });
  };
  const selTicket = tickets.find((tk) => tk.id === sel);
  const custLabel = selTicket && selTicket.user ? (selTicket.user.name || selTicket.user.email) : "";
  const onSend = (body) =>
    supportAdminApi.reply(sel, body)
      .then((m) => { if (m) setTicket((tk) => (tk ? { ...tk, messages: [...(tk.messages || []), m] } : tk)); loadTickets(); })
      .catch(() => showToast(s.sendError, "error"));
  const changeStatus = (status) =>
    supportAdminApi.setStatus(sel, status)
      .then(() => { setTicket((tk) => (tk ? { ...tk, status } : tk)); loadTickets(); })
      .catch(() => showToast(s.statusError, "error"));
  const changePriority = (priority) =>
    supportAdminApi.setPriority(sel, priority)
      .then(() => { setTicket((tk) => (tk ? { ...tk, priority } : tk)); loadTickets(); })
      .catch(() => showToast(s.statusError, "error"));

  return (
    <>
      <ViewHead title={s.inboxTitle} sub={s.inboxSubtitle} />
      <div className="filter-tabs">
        {["all", ...TICKET_STATUSES].map((k) => (
          <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{k === "all" ? s.all : s.statuses[k]}</button>
        ))}
      </div>
      <div className="inbox">
        <div className="panel inbox-list">
          <div className="inbox-list-h">{s.tickets}</div>
          {tickets.length === 0 && <div className="empty" style={{ padding: "24px 12px" }}>{s.noTickets}</div>}
          {tickets.map((tk) => {
            const label = (tk.user && (tk.user.name || tk.user.email)) || "—";
            return (
              <button key={tk.id} className={`inbox-item${sel === tk.id ? " active" : ""}`} onClick={() => open(tk.id)}>
                <span className="av-sm">{label.slice(0, 2).toUpperCase()}</span>
                <div className="inbox-item-body"><b>{tk.subject}</b><span>{label} · {tk.lastFromStaff ? `${s.staff}: ` : ""}{humanizeLocal(tk.lastMessage)}</span></div>
                <div className="tk-meta"><span className="tk-time">{fmtWhen(tk.lastAt)}</span><span className="tk-tags"><TicketPriorityTag priority={tk.priority} /><TicketStatusPill status={tk.status} /></span>{tk.unread > 0 && <span className="inbox-badge">{tk.unread}</span>}</div>
              </button>
            );
          })}
        </div>
        <div className="inbox-chat">
          {sel && ticket ? (
            <div className="panel chat-panel">
              <div className="ticket-head">
                <div className="th-info">
                  <b>{ticket.subject}</b>
                  {custLabel && <span className="th-sub">{custLabel}{selTicket && lastSeenLabel(selTicket.lastSeen) ? <> · <span className={selTicket.lastSeen && Date.now() - new Date(selTicket.lastSeen).getTime() < 3 * 60 * 1000 ? "th-online" : ""}>{lastSeenLabel(selTicket.lastSeen)}</span></> : null}</span>}
                </div>
                <div className="th-controls">
                  <MiniSelect value={ticket.priority || "normal"} options={TICKET_PRIORITIES.map((p) => ({ value: p, label: s.priorities[p] }))} onChange={changePriority} />
                  <MiniSelect value={ticket.status} options={TICKET_STATUSES.map((st) => ({ value: st, label: s.statuses[st] }))} onChange={changeStatus} />
                </div>
              </div>
              <ChatPanel messages={ticket.messages} mineWhenStaff={true} placeholder={s.replyPlaceholder} sendLabel={s.reply} emptyText={s.empty} youLabel={s.you} staffLabel={s.staff} seenLabel={s.seen} onSend={onSend} />
            </div>
          ) : (
            <div className="panel"><div className="empty" style={{ padding: "60px 20px" }}>{s.selectTicket}</div></div>
          )}
        </div>
      </div>
    </>
  );
}
