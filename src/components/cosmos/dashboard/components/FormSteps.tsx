/* FormSteps: a long form in a dialog, split into steps (product owner, 2026-10-27: a form with
   many fields or much to read goes in steps, so it is simpler). The steps are named at the top,
   numbered, with a check once passed; a passed step can be opened again from there. Each step's
   fields are the dialog's body; the footer goes back, on (only once the step is valid) and, on the
   last step, does what the form is for. The onboarding's stepper (onboarding/Stepper.tsx), compact
   for a dialog. On each step change the step's first field takes the focus. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { IcCheck } from "@/components/cosmos/icons";

/** The step on screen and the furthest one reached, with the moves between them. */
export function useFormSteps(count: number) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const goto = (i: number) => { if (i >= 0 && i <= reached && i < count) setStep(i); };
  const next = () => setStep((s) => {
    const n = Math.min(count - 1, s + 1);
    setReached((r) => Math.max(r, n));
    return n;
  });
  const back = () => setStep((s) => Math.max(0, s - 1));
  return { step, reached, goto, next, back, first: step === 0, last: step === count - 1, count };
}
export type FormStepsState = ReturnType<typeof useFormSteps>;

/** The steps' names, the current one marked; a reached step opens again on a click. */
export function FormSteps({ names, steps }: { names: string[]; steps: FormStepsState }) {
  const t = useT();
  const fs = t.dash.common.steps;
  return (
    <nav className="fsteps" aria-label={fs.label}>
      <ol>
        {names.map((name, i) => {
          const state = i === steps.step ? "is-current" : i <= steps.reached && i < steps.step ? "is-done" : i <= steps.reached ? "is-reached" : "is-todo";
          return (
            <li key={name} className={`fstep ${state}`}>
              <button type="button" disabled={i > steps.reached || i === steps.step} aria-current={i === steps.step ? "step" : undefined} onClick={() => steps.goto(i)}>
                <span className="fstep-n" aria-hidden="true">{state === "is-done" ? <IcCheck /> : i + 1}</span>
                <span className="fstep-l">{name}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="fsteps-of" aria-live="polite">{fmt(fs.of, { n: steps.step + 1, total: names.length })}</p>
    </nav>
  );
}

/** The step's fields; the first one takes the focus when the step opens. */
export function FormStep({ steps, children }: { steps: FormStepsState; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  useEffect(() => {
    // The dialog focuses its own first field when it opens; later steps do it here.
    if (!opened.current) { opened.current = true; return; }
    ref.current?.querySelector<HTMLElement>("input:not([type=hidden]):not(:disabled), select, textarea, button:not(:disabled)")?.focus();
  }, [steps.step]);
  return <div className="fstep-body arrive" key={steps.step} ref={ref}>{children}</div>;
}

/** Back (or cancel on the first step), on, and on the last step the form's own action. */
export function FormStepsFooter({ steps, canNext, onCancel, submitLabel, onSubmit, busy = false, submitDisabled = false }: {
  steps: FormStepsState;
  canNext: boolean;
  onCancel: () => void;
  submitLabel: ReactNode;
  onSubmit: () => void;
  busy?: boolean;
  submitDisabled?: boolean;
}) {
  const t = useT();
  const fs = t.dash.common.steps;
  return (
    <div className="modal-actions fsteps-actions">
      {steps.last
        ? <button type="button" className="btn btn-violet" disabled={submitDisabled || busy} onClick={onSubmit}>{submitLabel}</button>
        : <button type="button" className="btn btn-violet" disabled={!canNext} onClick={steps.next}>{fs.next}</button>}
      {steps.first
        ? <button type="button" className="btn btn-soft" onClick={onCancel}>{t.dash.common.cancel}</button>
        : <button type="button" className="btn btn-soft" onClick={steps.back} disabled={busy}>{fs.back}</button>}
    </div>
  );
}
