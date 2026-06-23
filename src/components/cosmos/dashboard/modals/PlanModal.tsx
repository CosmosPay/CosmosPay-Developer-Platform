import { useState } from "react";
import { Modal, IcCheck, IcArrow } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { PLAN_IDS, PLAN_SPECS, PLAN_PRICE } from "@/lib/plans.ts";

/* Render a spec value: booleans → check / dash, null numbers → ∞, everything else as-is. */
function Cell({ v }) {
  if (v === true) return <IcCheck />;
  if (v === false) return <span className="pcm-no">—</span>;
  if (v === null) return <span>∞</span>;
  return <span>{v}</span>;
}

/* Plan switcher — always shows a full side-by-side comparison (in the style of the
   pricing page) between the current plan and a selected one, built entirely from the
   shared plan specs (@/lib/plans), so org counts, mainnet support, fees and limits stay
   in sync everywhere. Selecting routes through a confirmation (onSelect) before applying. */
export function PlanModal({ current, onClose, onSelect, enabledPlans }) {
  const t = useT();
  const p = t.dash.settings.plan;
  const names = t.dash.planNames;
  const curIdx = PLAN_IDS.indexOf(current);
  // Only offer the env-enabled plans (always keep the current one visible).
  const ids = PLAN_IDS.filter((id) => !enabledPlans || !enabledPlans.length || enabledPlans.includes(id) || id === current);
  // Default the comparison to the first other enabled plan (or the current one).
  const [target, setTarget] = useState(ids.find((id) => id !== current) || current);
  const isSame = target === current;
  const isUpgrade = PLAN_IDS.indexOf(target) > curIdx;
  const a = PLAN_SPECS[current];
  const b = PLAN_SPECS[target];

  const apiLabel = (lvl) => (p.apiLevels && p.apiLevels[lvl]) || lvl;
  // Each row pulls both plans' values straight from the shared specs.
  const rows = [
    { l: p.price, a: a.price, b: b.price },
    { l: p.perTx, a: a.perTx, b: b.perTx },
    { l: p.apiAccess, a: apiLabel(a.api), b: apiLabel(b.api) },
    { l: p.mainnet, a: a.mainnet, b: b.mainnet },
    { l: p.orgs, a: a.maxOrgs, b: b.maxOrgs },
    { l: p.seats, a: a.maxSeats, b: b.maxSeats },
    { l: p.apiKeys, a: a.maxApiKeys, b: b.maxApiKeys },
    { l: p.settle, a: a.settle, b: b.settle },
  ];

  return (
    <Modal onClose={onClose}><div className="modal-body">
      <div className="modal-eyebrow">{t.dash.viewLabels.settings}</div>
      <h3>{p.changeTitle}</h3>
      <p>{p.changeSub}</p>

      <div className="plan-cmp-pills">
        {ids.map((id) => (
          <button key={id} className={`plan-cmp-pill${id === target ? " on" : ""}${id === current ? " cur" : ""}`} onClick={() => setTarget(id)}>
            {names[id]}{id === current && <span className="pcp-tag">{p.youAreHere}</span>}
          </button>
        ))}
      </div>

      <div className="plan-cmp">
        <div className="plan-cmp-head">
          <div className="pcm-feat">{p.feature}</div>
          <div className="pcm-col">
            <span className="pcm-plan">{names[current]}</span>
            <span className="pcm-price">{PLAN_PRICE[current]}</span>
            <span className="pcm-badge cur">{p.current}</span>
          </div>
          <div className="pcm-col target">
            <span className="pcm-plan">{names[target]}</span>
            <span className="pcm-price">{PLAN_PRICE[target]}</span>
            {isSame
              ? <span className="pcm-badge same">{p.youAreHere}</span>
              : <span className={`pcm-badge ${isUpgrade ? "up" : "down"}`}>{isUpgrade ? p.upgrade : p.downgrade}</span>}
          </div>
        </div>
        <table className="plan-cmp-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.l} className={row.a !== row.b ? "diff" : ""}>
                <th>{row.l}</th>
                <td><Cell v={row.a} /></td>
                <td className="target"><Cell v={row.b} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSame && !isUpgrade && <p className="plan-cmp-note">{p.downgradeNote}</p>}

      <div className="modal-actions">
        {isSame
          ? <button className="btn btn-soft" disabled>{p.current}</button>
          : <button className="btn btn-violet" onClick={() => { onSelect(target); onClose(); }}>{fmt(p.switchTo, { plan: names[target] })} <IcArrow /></button>}
        <a className="btn btn-soft" href="/pricing">{t.dash.common.viewPlans}</a>
        <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
      </div>
    </div></Modal>
  );
}
