/* SpecPanel.jsx — right-hand live plan spec panel with tab switcher. */
import { I } from "./icons";
import { PLAN_IDS, SUPPORT_FOR, PLAN_DATA } from "./data";

function SpecRow({ icon, k, v, flag, no }) {
  return (<div className="spec-cell"><span className="k">{icon}{k}</span><span className={`v${flag ? (no ? " no" : " yes") : ""}`}>{v}</span></div>);
}

export function SpecPanel({ t, viewId, setViewId, selectedId, recId, showRec }) {
  const ob = t.onboarding;
  const id = PLAN_DATA[viewId] ? viewId : "growth";
  const d = PLAN_DATA[id];
  const p = ob.plans[id];
  const isSel = id === selectedId;
  const isRec = showRec && id === recId && !isSel;
  return (
    <aside className="ob-right">
      <div className="rp">
        <div className="rp-tagline"><h2>{ob.specTagline}</h2><p>{ob.specTaglineSub}</p></div>
        <div className="spec">
          <div className="spec-tabs">
            {PLAN_IDS.map((pid) => (
              <button key={pid} className={`spec-tab${pid === id ? " on" : ""}`} onClick={() => setViewId(pid)}>{t.dash.planNames[pid]}</button>
            ))}
          </div>
          <div className="spec-main" key={id}>
            {isSel ? <span className="spec-badge sel">{I.chk} {ob.selectedPlan}</span>
              : isRec ? <span className="spec-badge rec">{I.bolt} {ob.recommendedForYou}</span>
                : <span className="spec-badge rec">{p.desc}</span>}
            <div className="spec-name">{t.dash.planNames[id]}</div>
            <div className="spec-price"><span className="amt">{d.price}</span>{d.per && <span className="per">{d.per}</span>}</div>
            <div className="spec-pnote">{p.pnote}</div>
            <div className="spec-grid">
              <SpecRow icon={I.coin} k={ob.spec.perTx} v={d.perTx} />
              <SpecRow icon={I.bolt} k={ob.spec.settle} v={d.settle} />
              <SpecRow icon={I.net} k={ob.spec.network} v="Stellar" />
              <SpecRow icon={I.team} k={ob.spec.team} v={p.team} />
              <SpecRow icon={I.org} k={ob.spec.orgs} v={d.orgs} />
              <SpecRow icon={I.life} k={ob.spec.support} v={ob.supportLevels[SUPPORT_FOR[id]]} />
              <SpecRow icon={I.bolt} k={ob.spec.live} v={d.live ? ob.spec.included : ob.spec.notIncluded} flag no={!d.live} />
            </div>
            <div className="spec-feats">
              <div className="fl">{ob.whatsIncluded}</div>
              <ul>{p.feats.map((f) => <li key={f}>{I.chk}{f}</li>)}</ul>
            </div>
          </div>
        </div>
        <div className="rp-foot">{I.shield} {ob.specFoot}</div>
      </div>
    </aside>
  );
}
