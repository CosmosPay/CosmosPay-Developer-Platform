import { IcCheck, IcArrow, ctaProps } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { PLAN_IDS, PLAN_SPECS } from "@/lib/plans.ts";
import { PLAN_META } from "./data";
import { Price } from "./Price";

const fmtLimit = (n) => (n == null ? "∞" : String(n));

/* Per-plan limits (organizations, seats per org, API keys) pulled from the shared specs
   (@/lib/plans) so each card always reflects the real plan. */
function PlanLimits({ spec, p }) {
  if (!spec) return null;
  return (
    <div className="plan-limits">
      <div className="pl-row"><span>{p.orgsRow}</span><b>{fmtLimit(spec.maxOrgs)}</b></div>
      <div className="pl-row"><span>{p.seatsRow}</span><b>{fmtLimit(spec.maxSeats)}</b></div>
      <div className="pl-row"><span>{p.keysRow}</span><b>{fmtLimit(spec.maxApiKeys)}</b></div>
    </div>
  );
}

export function PlansSection({ user, billing }) {
  const t = useT();
  const p = t.pricing;
  return (
    <section className="wrap">
      <div className="plans">
        {p.plans.map((plan, i) => {
          const meta = PLAN_META[i];
          const spec = PLAN_SPECS[PLAN_IDS[i]];
          return (
            <div className={`plan reveal${meta.featured ? " featured" : ""}${i === p.plans.length - 1 ? " wide-plan" : ""}`} key={plan.name} style={{ transitionDelay: `${i * 0.06}s` }}>
              {meta.tag && plan.tag && <span className="plan-tag">{plan.tag}</span>}
              {meta.featured && <span className="plan-tag">{p.popular}</span>}
              <div className="pname">{plan.name}</div>
              <div className="pdesc">{plan.desc}</div>
              <Price plan={plan} meta={meta} billing={billing} t={t} />
              <PlanLimits spec={spec} p={p} />
              <a className={`btn ${meta.ctaCls}`} {...ctaProps(user)}>{plan.cta}{meta.ctaCls === "btn-violet" && <IcArrow />}</a>
              <ul>
                {plan.feats.map((f, j) => (
                  <li className={meta.on[j] ? "" : "off"} key={f}>{meta.on[j] ? <IcCheck /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 12h12" /></svg>}{f}</li>
                ))}
              </ul>
            </div>
          );
        })}
        <div className="ent-card reveal">
          <div className="ent-info">
            <div className="ent-name">{p.enterprise.name}</div>
            <p>{p.enterprise.desc}</p>
            <ul className="ent-feats">{p.enterprise.feats.map((f) => <li key={f}><IcCheck />{f}</li>)}</ul>
            <PlanLimits spec={PLAN_SPECS.enterprise} p={p} />
          </div>
          <div className="ent-cta">
            <div className="ent-price">{p.enterprise.price}</div>
            <div className="ent-subt">{p.enterprise.subt}</div>
            <a className="btn btn-dark" href="#">{p.enterprise.cta} <IcArrow /></a>
          </div>
        </div>
      </div>
      <p style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 14, maxWidth: "52em", margin: "26px auto 0", lineHeight: 1.6 }}>
        {p.footnote}
      </p>
    </section>
  );
}
