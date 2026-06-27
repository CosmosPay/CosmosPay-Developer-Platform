/* GoalsStep.jsx — step 1: goals (multi-select) + volume segmented control. */
import { I } from "@/components/cosmos/onboarding/icons";
import { GOAL_IDS, VOLUME_IDS } from "@/components/cosmos/onboarding/data";

export function GoalsStep({ ob, goals, toggleGoal, volume, setVolume }) {
  return (
    <div className="ob-fade">
      <div className="ob-eyebrow">{ob.goalsEyebrow}</div>
      <h1>{ob.goalsTitle}</h1>
      <p className="sub">{ob.goalsSub}</p>
      <div className="ob-opts two">
        {GOAL_IDS.map((id) => (
          <button key={id} className={`ob-opt${goals.includes(id) ? " on" : ""}`} onClick={() => toggleGoal(id)}>
            <span className="oic">{I[id]}</span>
            <span className="otx"><span className="ot">{ob.goals[id].t}</span><span className="os">{ob.goals[id].s}</span></span>
            <span className="ock">{I.chk}</span>
          </button>
        ))}
      </div>
      <label className="ob-field-l" style={{ marginTop: 22 }}>{ob.volumeLabel}</label>
      <div className="ob-seg">
        {VOLUME_IDS.map((id) => (
          <button key={id} className={volume === id ? "on" : ""} onClick={() => setVolume(id)}>
            <span className="vt">{ob.volumes[id].t}</span><span className="vs">{ob.volumes[id].s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
