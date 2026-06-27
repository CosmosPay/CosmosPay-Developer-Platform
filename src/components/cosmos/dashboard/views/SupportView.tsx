import { useState, useId } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { support as supportApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePolling } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ChatPanel } from "@/components/cosmos/dashboard/components/ChatPanel";
import { TicketStatusPill, TicketPriorityTag } from "@/components/cosmos/dashboard/components/TicketStatusPill";

/* Customer support — a ticket system. The customer can open several tickets in parallel;
   each has a subject, a status and its own message thread. */
export function SupportView() {
  const t = useT();
  const s = t.dash.support;
  const subjectId = useId();
  const msgId = useId();
  const [tickets, setTickets] = useState([]);
  const [sel, setSel] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMsg, setFirstMsg] = useState("");
  const [error, setError] = useState(false);

  const loadTickets = () => supportApi.tickets().then((d) => { setTickets(Array.isArray(d) ? d : []); setError(false); }).catch(() => setError(true));
  const loadTicket = (id) => supportApi.ticket(id).then((d) => setTicket(d || null)).catch(() => {});
  usePolling(loadTickets, 12000);
  usePolling(() => { if (sel) loadTicket(sel); }, 10000);

  // Opening a ticket marks it read server-side; clear its unread badge immediately too.
  const open = (id) => { setCreating(false); setSel(id); setTickets((ts) => ts.map((tk) => (tk.id === id ? { ...tk, unread: 0 } : tk))); loadTicket(id).then(loadTickets); };
  const startNew = () => { setCreating(true); setSel(null); setTicket(null); setSubject(""); setFirstMsg(""); };
  const create = () => {
    if (!subject.trim() || !firstMsg.trim()) return;
    supportApi.create(subject.trim(), firstMsg.trim())
      .then((tk) => { if (tk) { loadTickets(); open(tk.id); } })
      .catch(() => showToast(s.createError, "error"));
  };
  const onSend = (body) =>
    supportApi.send(sel, body)
      .then((m) => { if (m) setTicket((tk) => (tk ? { ...tk, messages: [...(tk.messages || []), m] } : tk)); loadTickets(); })
      .catch(() => showToast(s.sendError, "error"));

  return (
    <>
      <ViewHead title={s.title} sub={s.subtitle}><button className="btn btn-dark btn-sm" onClick={startNew}>{DI.plus} {s.newTicket}</button></ViewHead>
      <div className="inbox">
        <div className="panel inbox-list">
          <div className="inbox-list-h">{s.myTickets}</div>
          {error && <div className="empty" style={{ padding: "24px 12px" }}>{s.loadError}</div>}
          {!error && tickets.length === 0 && <div className="empty" style={{ padding: "24px 12px" }}>{s.noTickets}</div>}
          {tickets.map((tk) => (
            <button key={tk.id} className={`inbox-item${sel === tk.id ? " active" : ""}`} onClick={() => open(tk.id)}>
              <div className="inbox-item-body">
                <b>{tk.subject}</b>
                <span>{tk.lastFromStaff ? `${s.staff}: ` : ""}{tk.lastMessage}</span>
              </div>
              <div className="tk-meta"><span className="tk-time">{fmtWhen(tk.lastAt)}</span><span className="tk-tags"><TicketPriorityTag priority={tk.priority} /><TicketStatusPill status={tk.status} /></span>{tk.unread > 0 && <span className="inbox-badge">{tk.unread}</span>}</div>
            </button>
          ))}
        </div>
        <div className="inbox-chat">
          {creating ? (
            <div className="panel"><div className="ticket-new">
              <h3>{s.newTicketTitle}</h3>
              <label className="field-l" htmlFor={subjectId}>{s.subjectLabel}</label>
              <input id={subjectId} className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={s.subjectPlaceholder} maxLength={140} autoFocus />
              <label className="field-l" htmlFor={msgId} style={{ marginTop: 14 }}>{s.messageLabel}</label>
              <textarea id={msgId} className="field ticket-textarea" rows={5} value={firstMsg} onChange={(e) => setFirstMsg(e.target.value)} placeholder={s.placeholder} maxLength={4000} />
              <div className="modal-actions">
                <button className="btn btn-violet" disabled={!subject.trim() || !firstMsg.trim()} onClick={create}>{s.create}</button>
                <button className="btn btn-soft" onClick={() => setCreating(false)}>{t.dash.common.cancel}</button>
              </div>
            </div></div>
          ) : sel && ticket ? (
            <div className="panel chat-panel">
              <div className="ticket-head"><b>{ticket.subject}</b><span className="tk-tags"><TicketPriorityTag priority={ticket.priority} /><TicketStatusPill status={ticket.status} /></span></div>
              <ChatPanel messages={ticket.messages} mineWhenStaff={false} placeholder={s.placeholder} sendLabel={s.send} emptyText={s.empty} youLabel={s.you} staffLabel={s.staff} seenLabel={s.seen} onSend={onSend} />
            </div>
          ) : (
            <div className="panel"><div className="empty" style={{ padding: "60px 20px" }}>{s.selectTicket}</div></div>
          )}
        </div>
      </div>
    </>
  );
}
