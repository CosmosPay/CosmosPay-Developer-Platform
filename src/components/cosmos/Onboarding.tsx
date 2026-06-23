/* Onboarding.jsx — create-organization wizard (Organization → Goals → Plan → Review).
   Ported from the Cosmos Pay Design "onboarding" handoff; restyled to the project's
   own tokens (violet accent, no monospace) and fully i18n'd. */
import { useState, useEffect } from "react";
import { CosmosMark, IcArrow, IcSun, IcMoon, useTheme, LangSelect } from "@/components/cosmos/shared";
import { useT, fmt, initLang } from "@/lib/i18n/index";
import { organizations, account } from "@/lib/api-client";
import { VOL_REC } from "./onboarding/data";
import { I } from "./onboarding/icons";
import { Stepper } from "./onboarding/Stepper";
import { SpecPanel } from "./onboarding/SpecPanel";
import { OrgStep } from "./onboarding/steps/OrgStep";
import { GoalsStep } from "./onboarding/steps/GoalsStep";
import { PlanStep } from "./onboarding/steps/PlanStep";
import { ReviewStep } from "./onboarding/steps/ReviewStep";

export default function Onboarding({ lang, features }) {
  initLang(lang);
  const [theme, setTheme] = useTheme();
  const t = useT();
  const ob = t.onboarding;

  // Plan selection follows the env flags: locked to the default plan unless plan
  // changes are allowed and more than one plan is enabled.
  const feat = features || {};
  const enabledPlans = feat.enabledPlans;
  const defaultPlan = feat.defaultPlan || "community";
  const planSelectable = (feat.plansEnabled ?? true) && (feat.allowUserPlanChanges ?? true) && (!enabledPlans || enabledPlans.length > 1);
  const planOptions = planSelectable ? (enabledPlans && enabledPlans.length ? enabledPlans : undefined) : [defaultPlan];

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(null);
  const [goals, setGoals] = useState([]);
  const [volume, setVolume] = useState(null);
  const [plan, setPlan] = useState(defaultPlan);
  const [viewId, setViewId] = useState(defaultPlan);
  const [planTouched, setPlanTouched] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  const recId = volume ? (VOL_REC[volume] || "growth") : "growth";
  const showRec = planSelectable && !planTouched;

  useEffect(() => {
    if (planSelectable && !planTouched && volume) { setPlan(recId); setViewId(recId); }
  }, [volume, planTouched, planSelectable]);

  const pickPlan = (id) => { setPlanTouched(true); setPlan(id); setViewId(id); };
  const toggleGoal = (id) => setGoals((g) => g.includes(id) ? g.filter((x) => x !== id) : [...g, id]);
  const goto = (s) => setStep(s);

  const canNext = step === 0 ? name.trim().length > 0 : step === 3 ? agreed : true;
  const finish = () => {
    setCreating(true);
    setError(false);
    // Only attempt a plan change when the user could actually pick one; otherwise the
    // account keeps the default plan (the request would be rejected anyway).
    const planStep = planSelectable ? Promise.resolve(account.setPlan(plan)).catch(() => {}) : Promise.resolve();
    planStep
      .then(() => organizations.create(name.trim(), { industry: industry || undefined, goals: goals.length ? goals : undefined, volume: volume || undefined }))
      .then(() => { window.location.href = "/dashboard"; })
      .catch(() => { setError(true); setCreating(false); });
  };
  const next = () => { if (step < 3) { const n = step + 1; setStep(n); setMaxStep((m) => Math.max(m, n)); } else finish(); };

  return (
    <div className="ob">
      <section className="ob-left">
        <div className="ob-top">
          <a className="ob-brand" href="/"><CosmosMark size={26} color="var(--ink)" /> Cosmos&nbsp;Pay</a>
          <div className="ob-top-r">
            <LangSelect />
            <button className="ob-exit icon" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <IcSun /> : <IcMoon />}</button>
            <a className="ob-exit" href="/">{I.x} <span className="ob-exit-tx">{ob.cancel}</span></a>
          </div>
        </div>

        <Stepper step={step} maxStep={maxStep} names={ob.steps} goto={goto} />

        <div className="ob-main">
        <div className="ob-body" key={step}>
          {step === 0 && (
            <OrgStep ob={ob} name={name} setName={setName} industry={industry} setIndustry={setIndustry} />
          )}

          {step === 1 && (
            <GoalsStep ob={ob} goals={goals} toggleGoal={toggleGoal} volume={volume} setVolume={setVolume} />
          )}

          {step === 2 && (
            <PlanStep ob={ob} t={t} plan={plan} pickPlan={pickPlan} showRec={showRec} recId={recId} plans={planOptions} />
          )}

          {step === 3 && (
            <ReviewStep ob={ob} t={t} name={name} industry={industry} goals={goals} volume={volume} plan={plan} error={error} agreed={agreed} setAgreed={setAgreed} goto={goto} />
          )}
        </div>

        <div className="ob-foot">
          {step > 0 && <button className="ob-btn ghost" onClick={() => setStep((s) => s - 1)} disabled={creating}>{I.back} {ob.back}</button>}
          <button className="ob-btn primary" disabled={!canNext || creating} onClick={next}>
            {creating ? ob.creating : step < 3 ? ob.continue : ob.create}{!creating && <span className="arrow"><IcArrow /></span>}
          </button>
          {(step === 1 || step === 2) && <button className="ob-btn text ob-skip" onClick={() => setStep((s) => Math.min(3, s + 1))}>{ob.skip}</button>}
        </div>
        </div>
      </section>

      <SpecPanel t={t} viewId={viewId} setViewId={setViewId} selectedId={planTouched || step >= 2 ? plan : null} recId={recId} showRec={showRec} />
    </div>
  );
}
