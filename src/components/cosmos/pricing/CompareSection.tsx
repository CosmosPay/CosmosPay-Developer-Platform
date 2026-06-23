import { IcCheck } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { PLAN_IDS, PLAN_SPECS } from "@/lib/plans.ts";

export function CompareSection() {
  const t = useT();
  const p = t.pricing;
  // The limits block (organizations, team seats, API keys) is derived from the shared
  // plan specs (@/lib/plans), so what's shown here always matches the dashboard. Values
  // are strings so the table prints the number instead of treating 1 as a "yes" check.
  const limit = (n) => (n == null ? "∞" : String(n));
  const orgsRow = { l: p.orgsRow, v: PLAN_IDS.map((id) => limit(PLAN_SPECS[id].maxOrgs)) };
  const seatsRow = { l: p.seatsRow, v: PLAN_IDS.map((id) => limit(PLAN_SPECS[id].maxSeats)) };
  const keysRow = { l: p.keysRow, v: PLAN_IDS.map((id) => limit(PLAN_SPECS[id].maxApiKeys)) };
  const rows = [...p.compare, orgsRow, seatsRow, keysRow];
  return (
    <section className="compare wrap">
      <h2>{p.compareTitle}</h2>
      <table className="cmp-table">
        <thead><tr>{p.compareHead.map((h, i) => <th key={h} style={i === 0 ? undefined : { textAlign: "center" }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.l}>
              <th>{row.l}</th>
              {row.v.map((c, j) => (
                <td key={j} className={c === 1 ? "yes" : ""}>{c === 1 ? <IcCheck /> : c === 0 ? "—" : c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
