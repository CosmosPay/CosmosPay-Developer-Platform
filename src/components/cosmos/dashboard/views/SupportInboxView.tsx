import { useState, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { supportAdmin as supportAdminApi } from "@/lib/api-client";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/support-status";
import { humanizeLocal, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePolling, useListFilters, usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy } from "@/components/cosmos/icons";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TicketStatusPill, TicketPriorityTag } from "@/components/cosmos/dashboard/components/TicketStatusPill";
import { TicketDialog, ticketTone } from "@/components/cosmos/dashboard/components/TicketDialog";
import { MiniSelect } from "@/components/cosmos/dashboard/components/MiniSelect";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";

/* Staff support inbox: every customer ticket as every list (product owner, 2026-10-27: every list
   is the Payments table). Its figures first (tickets per status), the filter row (search by
   subject, customer or message; status with its counts), then the tickets as a table; a row opens
   its conversation in a dialog with the status and priority pickers, and its menu moves it through
   open → pending → resolved → closed from the list itself. */
const DEFAULTS = { q: "", status: "all" };
const ALLOWED = { status: ["all", ...TICKET_STATUSES] };
const COLS = 7;

export function SupportInboxView() {
  const t = useT();
  const s = t.dash.support;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const [sel, setSel] = useState(null);
  const [ticket, setTicket] = useState(null);

  // Every ticket, filtered here, so each status can say how many it holds.
  const loadTickets = () => supportAdminApi.tickets().then((d) => { setTickets(Array.isArray(d) ? d : []); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  // The ticket on screen is always the one selected: an answer for another (a slower request
  // for the previous selection) is dropped.
  const selRef = useRef(null);
  const loadTicket = (id) => supportAdminApi.ticket(id).then((d) => { if (selRef.current === id) setTicket(d || null); }).catch(() => {});
  usePolling(loadTickets, 12000);
  usePolling(() => { if (sel) loadTicket(sel); }, 10000);

  // Opening a ticket marks it read server-side; clear its unread badge immediately too.
  const open = (id) => { selRef.current = id; setSel(id); setTicket((cur) => (cur && cur.id === id ? cur : null)); setTickets((ts) => ts.map((tk) => (tk.id === id ? { ...tk, unread: 0 } : tk))); loadTicket(id).then(loadTickets); };
  const closeTicket = () => { selRef.current = null; setSel(null); setTicket(null); };
  // "Online" when active in the last 3 minutes, otherwise a "last seen" timestamp.
  const isOnline = (ts) => !!ts && Date.now() - new Date(ts).getTime() < 3 * 60 * 1000;
  const lastSeenLabel = (ts) => (!ts ? "" : isOnline(ts) ? s.online : fmt(s.lastSeen, { when: fmtWhen(ts) }));
  const customerOf = (tk) => (tk && tk.user && (tk.user.name || tk.user.email)) || "-";
  const onSend = (body) =>
    supportAdminApi.reply(sel, body)
      .then((m) => { if (m) setTicket((tk) => (tk ? { ...tk, messages: [...(tk.messages || []), m] } : tk)); loadTickets(); })
      .catch(() => showToast(s.sendError, "error"));
  // A status or priority set from the row's menu or the open ticket's pickers alike.
  const changeStatus = (id, status) =>
    supportAdminApi.setStatus(id, status)
      .then(() => { setTicket((tk) => (tk && tk.id === id ? { ...tk, status } : tk)); setTickets((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x))); loadTickets(); })
      .catch(() => showToast(s.statusError, "error"));
  const changePriority = (id, priority) =>
    supportAdminApi.setPriority(id, priority)
      .then(() => { setTicket((tk) => (tk && tk.id === id ? { ...tk, priority } : tk)); setTickets((ts) => ts.map((x) => (x.id === id ? { ...x, priority } : x))); loadTickets(); })
      .catch(() => showToast(s.statusError, "error"));
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});

  const matches = (tk, skip) =>
    (skip === "status" || filters.status === "all" || tk.status === filters.status) &&
    matchesQuery([tk.subject, tk.lastMessage, tk.user && tk.user.name, tk.user && tk.user.email], filters.q);
  const shown = tickets.filter((tk) => matches(tk, null));
  const statusCounts = countBy(tickets.filter((tk) => matches(tk, "status")), (tk) => tk.status);
  const pg = usePaged(shown, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + shown.length);
  const selTicket = tickets.find((tk) => tk.id === sel);

  return (
    <>
      <ViewHead title={s.inboxTitle} />
      <ViewFigures
        label={s.inboxTitle} loading={loading} failed={error}
        items={TICKET_STATUSES.map((st) => ({ key: st, label: s.statuses[st], value: tickets.filter((tk) => tk.status === st).length }))}
      />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={s.inboxSearch}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: tickets.filter((tk) => matches(tk, "status")).length },
            ...TICKET_STATUSES.map((st) => ({ key: st, label: (s.statuses && s.statuses[st]) || st, count: statusCounts[st] || 0, icon: <StatusIcon tone={ticketTone(st)} size={16} /> })),
          ],
        }}
        active={active} onReset={reset}
        shown={shown.length} total={loading ? undefined : tickets.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={s.tickets} cols={COLS} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx">
            <thead><tr><th>{s.tableHead.subject}</th><th>{s.customer}</th><th>{s.tableHead.priority}</th><th>{s.tableHead.status}</th><th>{s.tableHead.last}</th><th>{s.tableHead.updated}</th><th><span className="sr-only">{cm.actions}</span></th></tr></thead>
            <tbody>
              {!error && pg.slice.map((tk) => {
                const who = customerOf(tk);
                return (
                  <tr key={tk.id} className="row-click" onClick={() => open(tk.id)}>
                    <td className="tid">
                      <span className="cell-mark">
                        <RecordLink onOpen={() => open(tk.id)} copy={tk.id} title={tk.subject}><b>{tk.subject}</b></RecordLink>
                        {tk.unread > 0 && <span className="inbox-badge" aria-label={fmt(s.unread, { n: tk.unread })}>{tk.unread}</span>}
                      </span>
                    </td>
                    <td><div className="cust-cell"><span className="av-sm">{who.slice(0, 2).toUpperCase()}</span><span className="cust">{who}</span></div></td>
                    <td className="cust">{tk.priority && tk.priority !== "normal" ? <TicketPriorityTag priority={tk.priority} /> : s.priorities.normal}</td>
                    <td><TicketStatusPill status={tk.status} /></td>
                    <td className="cust ticket-last">{tk.lastFromStaff ? `${s.staff}: ` : ""}{humanizeLocal(tk.lastMessage)}</td>
                    <td className="cust">{fmtWhen(tk.lastAt)}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${tk.subject}`} onClick={() => open(tk.id)}>{DI.docs}</button>
                      <RowMenu
                        label={fmt(cm.rowActions, { name: tk.subject })}
                        items={[
                          { key: "open", label: cm.details, icon: DI.docs, onClick: () => open(tk.id) },
                          ...TICKET_STATUSES.filter((st) => st !== tk.status).map((st) => ({ key: `status-${st}`, label: fmt(s.moveTo, { status: s.statuses[st] }), icon: <StatusIcon tone={ticketTone(st)} size={16} />, onClick: () => changeStatus(tk.id, st) })),
                          { key: "id", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(tk.id) },
                          ...(tk.user && tk.user.email ? [{ key: "email", label: t.dash.admin.copyEmail, icon: <IcCopy />, onClick: () => copy(tk.user.email) }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={COLS} empty={error ? s.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {sel && (
        <TicketDialog
          eyebrow={s.inboxTitle} subject={(ticket && ticket.subject) || (selTicket && selTicket.subject) || ""} ticket={ticket} onClose={closeTicket}
          meta={ticket && (
            <>
              <span className="th-sub">
                {customerOf(selTicket)}
                {selTicket && lastSeenLabel(selTicket.lastSeen) ? <> · <span className={isOnline(selTicket.lastSeen) ? "th-online" : ""}>{lastSeenLabel(selTicket.lastSeen)}</span></> : null}
              </span>
              <span className="th-controls">
                <MiniSelect value={ticket.priority || "normal"} options={TICKET_PRIORITIES.map((p) => ({ value: p, label: s.priorities[p] }))} onChange={(v) => changePriority(sel, v)} />
                <MiniSelect value={ticket.status} options={TICKET_STATUSES.map((st) => ({ value: st, label: s.statuses[st] }))} onChange={(v) => changeStatus(sel, v)} />
              </span>
            </>
          )}
          mineWhenStaff={true} placeholder={s.replyPlaceholder} sendLabel={s.reply} onSend={onSend}
        />
      )}
    </>
  );
}
