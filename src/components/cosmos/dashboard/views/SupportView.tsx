import { useState, useId, useEffect, useRef } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { support as supportApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy } from "@/components/cosmos/icons";
import { fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePolling, useUrlRequest, useListFilters, usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TICKET_STATUSES } from "@/lib/support-status";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { TicketDialog, ticketTone } from "@/components/cosmos/dashboard/components/TicketDialog";
import { TicketStatusPill, TicketPriorityTag } from "@/components/cosmos/dashboard/components/TicketStatusPill";

/* Customer support: a ticket system as every list (product owner, 2026-10-27: every list is the
   Payments table). Its figures first (tickets per status), the filter row (search, status) with
   "New ticket" at its right end, which opens in a dialog as every create, then the tickets as a
   table; a row opens its conversation in a dialog. The customer can open several in parallel. */
const DEFAULTS = { q: "", status: "all" };
const ALLOWED = { status: ["all", ...TICKET_STATUSES] };
const COLS = 6;

export function SupportView() {
  const t = useT();
  const s = t.dash.support;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const subjectId = useId();
  const msgId = useId();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMsg, setFirstMsg] = useState("");
  const [sending, setSending] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  const loadTickets = () => supportApi.tickets().then((d) => { setTickets(Array.isArray(d) ? d : []); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  // The ticket on screen is always the one selected: an answer for another is dropped.
  const selRef = useRef(null);
  const loadTicket = (id) => supportApi.ticket(id).then((d) => { if (selRef.current === id) setTicket(d || null); }).catch(() => {});
  usePolling(loadTickets, 12000);
  usePolling(() => { if (sel) loadTicket(sel); }, 10000);

  // Opening a ticket marks it read server-side; clear its unread badge immediately too.
  const open = (id) => { setCreating(false); selRef.current = id; setSel(id); setTicket((cur) => (cur && cur.id === id ? cur : null)); setTickets((ts) => ts.map((tk) => (tk.id === id ? { ...tk, unread: 0 } : tk))); loadTicket(id).then(loadTickets); };
  const closeTicket = () => { selRef.current = null; setSel(null); setTicket(null); };
  // A ticket named from elsewhere (a reply's notification) opens on arrival.
  const [ticketReq, clearTicketReq] = useUrlRequest("open");
  useEffect(() => {
    if (!ticketReq) return;
    clearTicketReq();
    open(ticketReq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketReq]);
  const startNew = () => { setCreating(true); setSubject(""); setFirstMsg(""); };
  const create = () => {
    if (!subject.trim() || !firstMsg.trim() || sending) return;
    setSending(true);
    supportApi.create(subject.trim(), firstMsg.trim())
      .then((tk) => { if (tk) { loadTickets(); open(tk.id); } })
      .catch(() => showToast(s.createError, "error"))
      .finally(() => setSending(false));
  };
  const onSend = (body) =>
    supportApi.send(sel, body)
      .then((m) => { if (m) setTicket((tk) => (tk ? { ...tk, messages: [...(tk.messages || []), m] } : tk)); loadTickets(); })
      .catch(() => showToast(s.sendError, "error"));
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});

  const matches = (tk, skip) =>
    (skip === "status" || filters.status === "all" || tk.status === filters.status) &&
    matchesQuery([tk.subject, tk.lastMessage], filters.q);
  const shown = tickets.filter((tk) => matches(tk, null));
  const statusCounts = countBy(tickets.filter((tk) => matches(tk, "status")), (tk) => tk.status);
  const pg = usePaged(shown, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + shown.length);
  const selTicket = tickets.find((tk) => tk.id === sel);

  return (
    <>
      <ViewHead title={s.title} />
      <ViewFigures
        label={s.title} loading={loading} failed={error}
        items={TICKET_STATUSES.map((st) => ({ key: st, label: s.statuses[st], value: tickets.filter((tk) => tk.status === st).length }))}
      />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={s.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: tickets.filter((tk) => matches(tk, "status")).length },
            ...TICKET_STATUSES.map((st) => ({ key: st, label: (s.statuses && s.statuses[st]) || st, count: statusCounts[st] || 0, icon: <StatusIcon tone={ticketTone(st)} size={16} /> })),
          ],
        }}
        active={active} onReset={reset}
        shown={shown.length} total={loading ? undefined : tickets.length} loading={loading}
        actions={<button type="button" className="btn btn-dark btn-sm" onClick={startNew}>{DI.plus} {s.newTicket}</button>}
      />
      <div className="panel">
        {loading && <TableSkeleton label={s.tickets} cols={COLS} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx">
            <thead><tr><th>{s.tableHead.subject}</th><th>{s.tableHead.priority}</th><th>{s.tableHead.status}</th><th>{s.tableHead.last}</th><th>{s.tableHead.updated}</th><th><span className="sr-only">{cm.actions}</span></th></tr></thead>
            <tbody>
              {!error && pg.slice.map((tk) => (
                <tr key={tk.id} className="row-click" onClick={() => open(tk.id)}>
                  <td className="tid">
                    <span className="cell-mark">
                      <RecordLink onOpen={() => open(tk.id)} copy={tk.id} title={tk.subject}><b>{tk.subject}</b></RecordLink>
                      {tk.unread > 0 && <span className="inbox-badge" aria-label={fmt(s.unread, { n: tk.unread })}>{tk.unread}</span>}
                    </span>
                  </td>
                  <td className="cust">{tk.priority && tk.priority !== "normal" ? <TicketPriorityTag priority={tk.priority} /> : s.priorities.normal}</td>
                  <td><TicketStatusPill status={tk.status} /></td>
                  <td className="cust ticket-last">{tk.lastFromStaff ? `${s.staff}: ` : ""}{tk.lastMessage}</td>
                  <td className="cust">{fmtWhen(tk.lastAt)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${tk.subject}`} onClick={() => open(tk.id)}>{DI.docs}</button>
                    <RowMenu
                      label={fmt(cm.rowActions, { name: tk.subject })}
                      items={[
                        { key: "open", label: cm.details, icon: DI.docs, onClick: () => open(tk.id) },
                        { key: "id", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(tk.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={COLS} empty={error ? s.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {sel && (
        <TicketDialog
          eyebrow={s.title} subject={(ticket && ticket.subject) || (selTicket && selTicket.subject) || ""} ticket={ticket} onClose={closeTicket}
          meta={ticket && <span className="tk-tags"><TicketPriorityTag priority={ticket.priority} /><TicketStatusPill status={ticket.status} /></span>}
          mineWhenStaff={false} placeholder={s.placeholder} sendLabel={s.send} onSend={onSend}
        />
      )}
      {creating && (
        <Modal onClose={() => setCreating(false)} label={s.newTicketTitle}>
          <div className="modal-body">
            <div className="modal-eyebrow">{s.title}</div>
            <h3>{s.newTicketTitle}</h3>
            <label className="field-l" htmlFor={subjectId}>{s.subjectLabel}</label>
            <input id={subjectId} className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={s.subjectPlaceholder} maxLength={140} />
            <label className="field-l" htmlFor={msgId} style={{ marginTop: 14 }}>{s.messageLabel}</label>
            <textarea id={msgId} className="field ticket-textarea" rows={5} value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)} placeholder={s.placeholder} maxLength={4000} />
            <div className="modal-actions">
              <button type="button" className="btn btn-violet" disabled={!subject.trim() || !firstMsg.trim() || sending} onClick={create}>{s.create}</button>
              <button type="button" className="btn btn-soft" onClick={() => setCreating(false)}>{cm.cancel}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
