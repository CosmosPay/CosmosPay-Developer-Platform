/* OrgStep.jsx — step 0: organization name + industry. */
import { useId } from "react";
import { I } from "@/components/cosmos/onboarding/icons";
import { INDUSTRY_IDS } from "@/components/cosmos/onboarding/data";

export function OrgStep({ ob, name, setName, industry, setIndustry }) {
  const nameId = useId();
  return (
    <div className="ob-fade">
      <div className="ob-eyebrow">{ob.orgEyebrow}</div>
      <h1>{ob.orgTitle}</h1>
      <p className="sub">{ob.orgSub}</p>
      <label className="ob-field-l" htmlFor={nameId}>{ob.nameLabel}</label>
      <input id={nameId} className="ob-input" value={name} placeholder={ob.namePlaceholder} autoFocus onChange={(e) => setName(e.target.value)} />
      <p className="ob-input-note">{ob.nameNote}</p>
      <label className="ob-field-l" style={{ marginTop: 22 }}>{ob.industryLabel}</label>
      <div className="ob-opts two" role="group" aria-label={ob.industryLabel}>
        {INDUSTRY_IDS.map((id) => (
          <button key={id} className={`ob-opt radio${industry === id ? " on" : ""}`} onClick={() => setIndustry(id)}>
            <span className="oic">{I[id]}</span>
            <span className="otx"><span className="ot">{ob.industries[id].t}</span><span className="os">{ob.industries[id].s}</span></span>
            <span className="ock">{I.chk}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
