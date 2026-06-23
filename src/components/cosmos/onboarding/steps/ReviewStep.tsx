/* ReviewStep.jsx — step 3: review summary + terms agreement. */
import { I } from "../icons";
import { PLAN_DATA } from "../data";

export function ReviewStep({ ob, t, name, industry, goals, volume, plan, error, agreed, setAgreed, goto }) {
  return (
    <div className="ob-fade">
      <div className="ob-eyebrow">{ob.reviewEyebrow}</div>
      <h1>{ob.reviewTitle}</h1>
      <p className="sub">{ob.reviewSub}</p>
      <div className="ob-review">
        <div className="rv-row"><span className="l">{ob.rv.org}</span><span className="v">{name || "—"} <button className="rv-edit" onClick={() => goto(0)}>{ob.edit}</button></span></div>
        <div className="rv-row"><span className="l">{ob.rv.type}</span><span className={`v${industry ? "" : " muted"}`}>{industry ? ob.industries[industry].t : ob.notSet} <button className="rv-edit" onClick={() => goto(0)}>{ob.edit}</button></span></div>
        <div className="rv-row"><span className="l">{ob.rv.goals}</span><span className={`v${goals.length ? "" : " muted"}`}>{goals.length ? goals.map((g) => ob.goals[g].t).join(", ") : ob.notSet} <button className="rv-edit" onClick={() => goto(1)}>{ob.edit}</button></span></div>
        <div className="rv-row"><span className="l">{ob.rv.volume}</span><span className={`v${volume ? "" : " muted"}`}>{volume ? ob.volumes[volume].t : ob.notSet} <button className="rv-edit" onClick={() => goto(1)}>{ob.edit}</button></span></div>
        <div className="rv-row"><span className="l">{ob.rv.plan}</span><span className="v">{t.dash.planNames[plan]} · {PLAN_DATA[plan].amt} {ob.plans[plan].sub} <button className="rv-edit" onClick={() => goto(2)}>{ob.edit}</button></span></div>
      </div>
      {error && <p className="ob-input-note" style={{ color: "#D64545", marginTop: 12 }}>{ob.error}</p>}
      <label className={`ob-terms${agreed ? " on" : ""}`} onClick={() => setAgreed((a) => !a)}>
        <span className="box">{I.chk}</span>
        <span>{ob.termsPre}<a href="#" onClick={(e) => e.preventDefault()}>{ob.termsA}</a>{ob.termsMid}<a href="#" onClick={(e) => e.preventDefault()}>{ob.termsB}</a>{ob.termsPost}</span>
      </label>
    </div>
  );
}
