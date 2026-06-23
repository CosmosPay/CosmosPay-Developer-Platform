import { useT } from "@/lib/i18n/index";

/* Coloured status pill for a support ticket (open / pending / resolved / closed). */
export function TicketStatusPill({ status }) {
  const t = useT();
  const labels = t.dash.support.statuses || {};
  return <span className={`tk-status tk-${status}`}>{labels[status] || status}</span>;
}

/* Priority tag (low / normal / high / urgent). "normal" is muted; higher priorities pop. */
export function TicketPriorityTag({ priority }) {
  const t = useT();
  const labels = t.dash.support.priorities || {};
  // "normal" is the default — don't clutter the list with it; only flag notable priorities.
  if (!priority || priority === "normal") return null;
  return <span className={`tk-prio tk-prio-${priority}`}>{labels[priority] || priority}</span>;
}
