/* TicketDialog: a support ticket's conversation in a dialog, the support lists' row detail (product
   owner, 2026-10-27: every list is the Payments table, a row opens its detail). Its subject, what
   the list knows of it (`meta`: the tags for the customer; the customer, when they were last seen
   and the status and priority pickers for staff), then the thread and the composer. */
import { Modal } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { ChatPanel } from "@/components/cosmos/dashboard/components/ChatPanel";
import type { StatusTone } from "@/components/cosmos/dashboard/components/StatusIcon";

/** A ticket's status as a tone: resolved is done, closed is off, the rest wait on someone. */
export const ticketTone = (status: string): StatusTone => (status === "resolved" ? "ok" : status === "closed" ? "off" : "wait");

export function TicketDialog({ eyebrow, subject, ticket, meta = null, onClose, mineWhenStaff, placeholder, sendLabel, onSend }) {
  const t = useT();
  const s = t.dash.support;
  return (
    <Modal onClose={onClose} label={subject || eyebrow}>
      <div className="modal-body ticket-modal">
        <div className="modal-eyebrow">{eyebrow}</div>
        <h3>{subject}</h3>
        {meta && <div className="ticket-meta">{meta}</div>}
        <div className="panel chat-panel ticket-chat">
          {ticket
            ? <ChatPanel messages={ticket.messages} mineWhenStaff={mineWhenStaff} placeholder={placeholder} sendLabel={sendLabel} emptyText={s.empty} youLabel={s.you} staffLabel={s.staff} seenLabel={s.seen} onSend={onSend} />
            : <div className="chat-empty">{t.dash.cosmos.loading}</div>}
        </div>
      </div>
    </Modal>
  );
}
