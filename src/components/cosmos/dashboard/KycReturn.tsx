/* KycReturn.tsx — the BlindPay terms-of-service callback island.
   BlindPay redirects here after the user accepts the hosted terms, appending
   ?tos_id=… to the redirect_url we gave it. We read that single-use id from the
   query string and call the kyc proxy to enable the (inactive) receiver. The id is
   never entered by hand — capturing it from this redirect is the only legitimate path. */
import { useState, useEffect } from "react";
import { useT, initLang } from "@/lib/i18n/index";
import { kyc as kycApi, admin as adminApi } from "@/lib/api-client";
import { CosmosMark, IcArrow, IcCheck } from "@/components/cosmos/shared";

export default function KycReturn({ org, env, receiver, lang }) {
  initLang(lang);
  const t = useT();
  const k = t.dash.blindpay.kycReturn;
  const [state, setState] = useState("pending"); // pending | success | notos | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let tosId = "";
    try { tosId = new URLSearchParams(window.location.search).get("tos_id") || ""; } catch (e) { /* no-op */ }
    if (!tosId) { setState("notos"); return; }
    let alive = true;
    // Shared success path: if the wallet started this flow (deep link stored before the
    // BlindPay round-trip), hand control back to it; otherwise stay in the dashboard.
    const finish = () => {
      if (!alive) return;
      let ret = "";
      try { ret = sessionStorage.getItem("cosmos.kyc.return") || ""; sessionStorage.removeItem("cosmos.kyc.return"); } catch (e) { /* no-op */ }
      if (ret && /^[a-z][a-z0-9+.-]*:\/\//i.test(ret)) {
        window.location.href = ret + (ret.includes("?") ? "&" : "?") + "activated=1&receiver=" + encodeURIComponent(receiver);
        return;
      }
      setState("success");
    };
    const fail = (err) => { if (alive) { setMsg((err && err.message) || ""); setState("error"); } };
    kycApi.post(`receivers/${receiver}/enable`, env, org, { tos_id: tosId })
      .then(finish)
      .catch((err) => {
        // A platform owner finishing a cross-org approval isn't a member of the
        // receiver's org → fall back to the global admin enable.
        const s = err && err.status;
        if (s === 401 || s === 403 || s === 404) {
          adminApi.enableReceiver(receiver, tosId).then(finish).catch(fail);
          return;
        }
        fail(err);
      });
    return () => { alive = false; };
  }, [org, env, receiver]);

  const good = state === "success";
  let title = k.activating;
  let body = k.activatingBody;
  if (state === "success") { title = k.successTitle; body = k.successBody; }
  else if (state === "notos") { title = k.errorTitle; body = k.noTosId; }
  else if (state === "error") { title = k.errorTitle; body = msg || k.errorBody; }

  return (
    <main id="main" className="invite-wrap">
      <div className="invite-card">
        <a className="invite-brand" href="/"><CosmosMark size={28} /> <span>Cosmos&nbsp;Pay</span></a>
        <div className="invite-eyebrow">{k.eyebrow}</div>
        <div className={`invite-icon${good ? " good" : ""}`}>{good ? <IcCheck /> : <CosmosMark size={26} />}</div>
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="invite-actions">
          {state !== "pending" && (
            <a className={`btn ${good ? "btn-violet" : "btn-soft"}`} href="/dashboard?view=blindpay">{k.backToDashboard} <IcArrow /></a>
          )}
        </div>
      </div>
    </main>
  );
}
