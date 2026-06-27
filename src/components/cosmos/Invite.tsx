/* Invite.tsx — the /invite/:token magic-link landing. The page resolves the invitation
   server-side (and accepts it when the signed-in email matches); this island just renders
   the resulting state and, when needed, kicks off sign-in returning to this same link. */
import { useT, fmt, initLang } from "@/lib/i18n/index";
import { CosmosMark, IcArrow, IcCheck, startLogin } from "@/components/cosmos/shared";

export default function Invite({ state = "invalid", org = "", email = "", token = "", lang }) {
  initLang(lang);
  const t = useT();
  const v = t.invite;

  const map = {
    needsLogin: { title: fmt(v.joinTitle, { org }), body: fmt(v.signInToAccept, { org }), kind: "login" },
    success: { title: v.successTitle, body: fmt(v.successBody, { org }), kind: "dash", good: true },
    accepted: { title: v.acceptedTitle, body: v.acceptedBody, kind: "dash" },
    expired: { title: v.expiredTitle, body: v.expiredBody, kind: "home" },
    mismatch: { title: v.mismatchTitle, body: fmt(v.mismatchBody, { email }), kind: "login" },
    seat_limit: { title: v.seatLimitTitle, body: v.seatLimitBody, kind: "home" },
    invalid: { title: v.invalidTitle, body: v.invalidBody, kind: "home" },
  };
  const m = map[state] || map.invalid;

  return (
    <main id="main" className="invite-wrap">
      <div className="invite-card">
        <a className="invite-brand" href="/"><CosmosMark size={28} /> <span>Cosmos&nbsp;Pay</span></a>
        <div className="invite-eyebrow">{v.eyebrow}</div>
        <div className={`invite-icon${m.good ? " good" : ""}`}>{m.good ? <IcCheck /> : <CosmosMark size={26} />}</div>
        <h1>{m.title}</h1>
        <p>{m.body}</p>
        {email && (state === "needsLogin" || state === "mismatch") && <div className="invite-meta">{fmt(v.invitedAs, { email })}</div>}
        <div className="invite-actions">
          {m.kind === "login" && <button className="btn btn-violet" onClick={() => startLogin(`/invite/${token}`)}>{v.signInBtn} <IcArrow /></button>}
          {m.kind === "dash" && <a className="btn btn-violet" href="/dashboard">{v.goToDashboard} <IcArrow /></a>}
          {m.kind === "home" && <a className="btn btn-soft" href="/">{v.backHome}</a>}
        </div>
      </div>
    </main>
  );
}
