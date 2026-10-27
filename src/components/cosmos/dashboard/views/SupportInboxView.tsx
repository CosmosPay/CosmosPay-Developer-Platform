import { useState, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { supportAdmin as supportAdminApi } from "@/lib/api-client";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/support-status";
import { humanizeLocal, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePolling, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { ChatPanel } from "@/components/cosmos/dashboard/components/ChatPanel";
import { TicketStatusPill, TicketPriorityTag } from "@/components/cosmos/dashboard/components/TicketStatusPill";
import { MiniSelect } from "@/components/cosmos/dashboard/components/MiniSelect";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";

/* Staff support inbox: every customer ticket, with the dashboard's filter row as the customer's
   view has (search by subject, customer or message; status with its counts), a reply pane and
   a status selector to move tickets through open → pending → resolved → closed. A conversation,
   so a list beside its thread rather than a table. */
const DEFAULTS = { q: "", status: "all" };
const ALLOWED = { status: ["all", ...TICKET_STATUSES] };

export function SupportInboxView() {
  const t = useT();
  const s = t.dash.support;
  const fl = t.dash.filters;
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const [sel, setSel] = useState(null);
  const [ticket, setTicket] = useState(null);

  // Every ticket, filtered here, so each status can say how many it holds.
  const loadTickets = () => supportAdminApi.tickets().then((d) => { setTickets(Array.isArray(d) ? d : []); setError(false); }).catch(() => setError(true));
  // The ticket on screen is always the one selected: an answer for another (a slower request
  // for the previous selection) is dropped.
  const selRef = useRef(null);
  const loadTicket = (id) => supportAdminApi.ticket(id).then((d) => { if (selRef.current === id) setTicket(d || null); }).catch(() => {});
  usePolling(loadTickets, 12000);
  usePolling(() => { if (sel) loadTicket(sel); }, 10000);

  // Opening a ticket marks it read server-side; clear its unread badge immediately too.
  const open = (id) => { selRef.current = id; setSel(id); setTicket((cur) => (cur && cur.id === id ? cur : null)); setTickets((ts) => ts.map((tk) => (tk.id === id ? { ...tk, unread: 0 } : tk))); loadTicket(id).then(loadTickets); };
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

  const customerOf = (tk) => (tk.user && (tk.user.name || tk.user.email)) || "-";
  const matches = (tk, skip) =>
    (skip === "status" || filters.status === "all" || tk.status === filters.status) &&
    matchesQuery([tk.subject, tk.lastMessage, tk.user && tk.user.name, tk.user && tk.user.email], filters.q);
  const shown = tickets.filter((tk) => matches(tk, null));
  const statusCounts = countBy(tickets.filter((tk) => matches(tk, "status")), (tk) => tk.status);

  return (
    <>
      <ViewHead title={s.inboxTitle} />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={s.inboxSearch}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: tickets.filter((tk) => matches(tk, "status")).length },
            ...TICKET_STATUSES.map((st) => ({ key: st, label: (s.statuses && s.statuses[st]) || st, count: statusCounts[st] || 0, icon: <StatusIcon tone={st === "resolved" ? "ok" : st === "closed" ? "off" : "wait"} size={16} /> })),
          ],
        }}
        active={active} onReset={reset}
        shown={shown.length} total={tickets.length}
      />
      <div className="inbox">
        <div className="panel inbox-list">
          <div className="inbox-list-h">{s.tickets}</div>
          {error && <div className="empty" style={{ padding: "24px 12px" }}>{s.loadError}</div>}
          {!error && tickets.length === 0 && <div className="empty" style={{ padding: "24px 12px" }}>{s.noTickets}</div>}
          {!error && tickets.length > 0 && !shown.length && (
            <div className="empty" style={{ padding: "24px 12px" }}>
              {fl.noMatch}
              {active > 0 && <div><button type="button" className="fbar-reset" onClick={reset}>{fl.clear}</button></div>}
            </div>
          )}
          {shown.map((tk) => {
            const label = customerOf(tk);
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
