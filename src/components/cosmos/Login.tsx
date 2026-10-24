/* Login.tsx — the /login entry. Signing in is the Authentik OAuth flow, so this island
   starts it as soon as it mounts: a "Log in" click on cosmospay.lat is still one click.
   Before leaving it marks its own history entry (?manual=1), so coming BACK here from the
   provider shows the card instead of bouncing straight out again — the Back button is
   never a trap. */
import { useEffect, useState } from "react";
import { useT, initLang } from "@/lib/i18n/index";
import { CosmosLockup, IcArrow, signInWithAuthentik, HOME } from "@/components/cosmos/shared";

const MANUAL_PARAM = "manual";

export default function Login({ lang, next = "/dashboard" }: { lang?: string; next?: string }) {
  initLang(lang);
  const t = useT();
  const l = t.login;
  const [busy, setBusy] = useState(false);

  const go = () => {
    setBusy(true);
    // signIn.social redirects on success; it only resolves here when it failed.
    Promise.resolve(signInWithAuthentik(next))
      .then((res: any) => { if (res && res.error) setBusy(false); })
      .catch(() => setBusy(false));
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(MANUAL_PARAM)) return;
    url.searchParams.set(MANUAL_PARAM, "1");
    window.history.replaceState(null, "", url);
    go();
  }, []);

  return (
    <main id="main" className="login-screen">
      <div className="login-card">
        <a className="invite-brand" href={HOME}><CosmosLockup height={30} /></a>
        <h1>{l.title}</h1>
        <p>{l.sub}</p>
        <button type="button" className="btn btn-violet" onClick={go} disabled={busy}>{l.cta} <IcArrow /></button>
        <span className="login-note" role="status">{busy ? l.redirecting : l.note}</span>
        <a className="login-back" href={HOME}>{t.profile.backToSite}</a>
      </div>
    </main>
  );
}
