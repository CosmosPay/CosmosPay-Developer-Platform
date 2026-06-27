import { useState } from "react";
import { IcCheck } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { useOutside } from "@/components/cosmos/dashboard/hooks";

export function EnvSwitcher({ live, setLive }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const ENVS = [{ k: false, n: t.dash.env.sandbox, d: t.dash.env.testnet }, { k: true, n: t.dash.env.production, d: t.dash.env.mainnet }];
  return (
    <div className="org-wrap net" ref={ref}>
      <button className={`org-switch net-switch${open ? " open" : ""}${live ? " live" : ""}`} aria-haspopup="listbox" aria-expanded={open} aria-label={t.dash.env.heading} onClick={() => setOpen((o) => !o)}>
        <span className="env-tag">{live ? "LIVE" : "TEST"}</span><span className="org-nm lbl">{live ? t.dash.env.production : t.dash.env.sandbox}</span>
        <svg className="org-chev lbl" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
      </button>
      {open && (<div className="org-menu"><div className="org-menu-h">{t.dash.env.heading}</div>
        {ENVS.map((o) => (<button key={o.n} className={`org-opt${o.k === live ? " active" : ""}`} onClick={() => { setLive(o.k); setOpen(false); }}><span className="org-opt-nm"><b style={{ display: "block", fontSize: 14 }}>{o.n}</b><span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{o.d}</span></span>{o.k === live && <span className="org-check"><IcCheck /></span>}</button>))}
      </div>)}
    </div>
  );
}
