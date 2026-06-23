import { useState, useEffect, useRef } from "react";
import { fmtWhen } from "../helpers";

/* ---------------- support chat ---------------- */
export function ChatPanel({ messages, mineWhenStaff, placeholder, sendLabel, emptyText, youLabel, staffLabel, seenLabel = "", onSend }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: "end" }); }, [messages]);
  const submit = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    Promise.resolve(onSend(body)).then(() => setDraft("")).finally(() => setSending(false));
  };
  return (
    <div className="chat">
      <div className="chat-scroll">
        {(!messages || messages.length === 0) && <div className="chat-empty">{emptyText}</div>}
        {(messages || []).map((m) => {
          const mine = m.fromStaff === mineWhenStaff;
          const who = mine ? youLabel : (m.fromStaff ? staffLabel : (m.senderName || ""));
          // WhatsApp-style read receipt on my own messages: grey ✓✓ when sent, blue ✓✓ +
          // "Seen {time}" once the other side has read it.
          const seen = mine && (mineWhenStaff ? m.readByUser : m.readByStaff);
          const seenAt = mineWhenStaff ? m.readByUserAt : m.readByStaffAt;
          return (
            <div key={m.id} className={`chat-msg${mine ? " mine" : ""}`}>
              <div className="chat-bubble">{m.body}</div>
              <div className="chat-meta">
                {[who, fmtWhen(m.createdAt)].filter(Boolean).join(" · ")}
                {seen && seenAt ? ` · ${seenLabel} ${fmtWhen(seenAt)}` : ""}
                {mine && <span className={`chat-ticks${seen ? " read" : ""}`}>✓✓</span>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <input className="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <button type="submit" className="btn btn-violet btn-sm" disabled={!draft.trim() || sending}>{sendLabel}</button>
      </form>
    </div>
  );
}
