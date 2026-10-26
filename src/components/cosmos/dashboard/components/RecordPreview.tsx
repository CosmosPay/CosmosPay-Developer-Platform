/* What a record's id previews (RecordLink): the essentials of the record, so a glance answers
   "which one is this" without opening it. A payment: its status and amount, network, date, both
   accounts and its memo or message; any other record: a title and label / value pairs. */
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/index";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { amountLabel, networkLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { shortAddress } from "@/components/cosmos/dashboard/components/AddressLink";

const FAILED = ["FAILED", "CANCELLED", "EXPIRED"];
export const statusTone = (status: string) => (status === "SUCCEEDED" ? "ok" : FAILED.includes(status) ? "fail" : "wait");

/* A generic card: a title (the id), a headline (amount and status) and fields. */
export function PreviewCard({ title, label, headline, fields }: { title: string; label: string; headline?: ReactNode; fields: [string, ReactNode][] }) {
  return (
    <div className="rp">
      <div className="rp-head"><span className="rp-k">{label}</span><code>{title}</code></div>
      {headline && <div className="rp-line">{headline}</div>}
      <dl className="rp-fields">
        {fields.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </div>
  );
}

/* `status`: the list's own word for the status, so the card says what the row says. */
export function PaymentPreview({ p, status = undefined }: { p: any; status?: string }) {
  const t = useT();
  const pl = t.dash.paylinks;
  const f = pl.detail.fields;
  const h = t.dash.overview.hub;
  const note = p.memo || p.message;
  return (
    <PreviewCard
      label={h.thId}
      title={p.id}
      headline={<><b>{amountLabel(p, pl)}</b><span className={`hub-st-t ${statusTone(p.status)}`}>{status || (pl.status && pl.status[p.status]) || p.status}</span></>}
      fields={[
        [f.network, networkLabel(p)],
        [f.created, fmtDateTime(p.createdAt)],
        [h.thFrom, <code key="s">{p.source ? shortAddress(p.source) : "-"}</code>],
        [h.thTo, <code key="d">{p.destination ? shortAddress(p.destination) : "-"}</code>],
        ...(note ? [[p.memo ? f.memo : f.message, note] as [string, ReactNode]] : []),
      ]}
    />
  );
}
