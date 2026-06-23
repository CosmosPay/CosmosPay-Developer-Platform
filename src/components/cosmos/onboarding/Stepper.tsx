/* Stepper.jsx — top step indicator: (1) Label → (2) Label → …  Reached steps are clickable to edit. */
import { Fragment } from "react";
import { I } from "./icons";
import { STEP_IDS } from "./data";

export function Stepper({ step, maxStep, names, goto }) {
  return (
    <nav className="obsteps" aria-label="Onboarding steps">
      {STEP_IDS.map((id, i) => {
        const state = i === step ? "current" : i < step ? "done" : "todo";
        const reachable = i <= maxStep;
        return (
          <Fragment key={id}>
            <button type="button" className={`obstep is-${state}`} disabled={!reachable} aria-current={i === step ? "step" : undefined} onClick={() => { if (reachable) goto(i); }}>
              <span className="obstep-num">{i < step ? I.chk : i + 1}</span>
              <span className="obstep-label">{names[id]}</span>
            </button>
            {i < STEP_IDS.length - 1 && <span className="obstep-arrow" aria-hidden="true">{I.sep}</span>}
          </Fragment>
        );
      })}
    </nav>
  );
}
