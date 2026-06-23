/* PlanStep.jsx — step 2: plan picker. */
import { PLAN_IDS, POPULAR, PLAN_DATA } from "../data";

export function PlanStep({ ob, t, plan, pickPlan, showRec, recId, plans }) {
  const ids = plans && plans.length ? plans : PLAN_IDS;
  return (
    <div className="ob-fade">
      <div className="ob-eyebrow">{ob.planEyebrow}</div>
      <h1>{ob.planTitle}</h1>
      <p className="sub">{ob.planSub}</p>
      <div className="ob-plans">
        {ids.map((id) => (
          <button key={id} className={`pp${plan === id ? " on" : ""}`} onClick={() => pickPlan(id)}>
            <span className="pp-radio" />
            <span className="pp-mid">
              <span className="pp-name">{t.dash.planNames[id]}
                {id === POPULAR && <span className="pp-pop">{ob.popular}</span>}
                {showRec && id === recId && plan !== id && <span className="pp-pop" style={{ background: "transparent", color: "var(--ob-accent)", border: "1px solid currentColor" }}>{ob.recommended}</span>}
              </span>
              <span className="pp-desc">{ob.plans[id].desc}</span>
            </span>
            <span className="pp-price"><span className="a">{PLAN_DATA[id].amt}</span><span className="b">{ob.plans[id].sub}</span></span>
          </button>
        ))}
      </div>
      <p className="ob-input-note" style={{ marginTop: 14 }}>{ob.enterpriseNote} <a href="/pricing" style={{ color: "var(--ob-accent)", fontWeight: 600 }}>{ob.enterpriseLink}</a></p>
    </div>
  );
}
