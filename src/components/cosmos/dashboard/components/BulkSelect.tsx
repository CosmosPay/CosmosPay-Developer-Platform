/* Selecting several rows of a table to act on them at once (product owner, 2026-10-27: a table
   lets you select several items, to delete them for instance). A checkbox opens each row and one in
   the head selects the rows on the page (mixed when only some are); while any row is selected the
   filter row offers the bulk actions with how many are selected (product owner: buttons in the
   filter row). A row that cannot take the action (a settled payment) has its checkbox disabled,
   with the reason as its name. The selection follows the list: a row that leaves it (deleted,
   filtered out, another environment) leaves the selection. Deleting asks first (ConfirmModal, the
   names of what goes) and then runs a few at a time, saying how many went and how many could not. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmt, useT } from "@/lib/i18n/index";
import { showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { DI } from "@/components/cosmos/dashboard/icons";
import { countText } from "@/components/cosmos/dashboard/components/ActivityPanel";

export interface Selection {
  selected: Set<string>;
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
}

/** The rows selected among `ids` (the list as it stands, every page). */
export function useSelection(ids: string[]): Selection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const key = ids.join(",");
  useEffect(() => {
    const present = new Set(ids);
    setSelected((s) => {
      const keep = [...s].filter((id) => present.has(id));
      return keep.length === s.size ? s : new Set(keep);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return {
    selected,
    count: selected.size,
    has: (id) => selected.has(id),
    toggle: (id) => setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    }),
    setMany: (list, on) => setSelected((s) => {
      const next = new Set(s);
      for (const id of list) { if (on) next.add(id); else next.delete(id); }
      return next;
    }),
    clear: () => setSelected(new Set()),
  };
}

/** The head's checkbox: every selectable row on the page, mixed when only some are selected. */
export function SelectHead({ sel, pageIds }: { sel: Selection; pageIds: string[] }) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  const on = pageIds.filter((id) => sel.has(id)).length;
  const all = pageIds.length > 0 && on === pageIds.length;
  useEffect(() => { if (ref.current) ref.current.indeterminate = on > 0 && !all; }, [on, all]);
  return (
    <th className="sel">
      <input
        ref={ref} type="checkbox" className="sel-box" checked={all} disabled={!pageIds.length}
        aria-label={t.dash.common.selectPage} onChange={() => sel.setMany(pageIds, !all)}
      />
    </th>
  );
}

/** A row's checkbox; a click on it never opens the row. */
export function SelectCell({ sel, id, name, disabled = false, hint }: { sel: Selection; id: string; name: string; disabled?: boolean; hint?: string }) {
  const t = useT();
  const label = fmt(t.dash.common.selectRow, { name });
  return (
    <td className="sel" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox" className="sel-box" checked={!disabled && sel.has(id)} disabled={disabled}
        aria-label={disabled && hint ? `${label}: ${hint}` : label} title={disabled ? hint : undefined}
        onChange={() => sel.toggle(id)}
      />
    </td>
  );
}

/** The filter row's actions while rows are selected: how many, delete them, clear the selection. */
export function BulkActions({ sel, onDelete, busy = false }: { sel: Selection; onDelete: () => void; busy?: boolean }) {
  const t = useT();
  const cm = t.dash.common;
  const num = new Intl.NumberFormat();
  return (
    <>
      <span className="bulk-n" role="status">{countText(sel.count, cm.selectedOne, cm.selectedN, num)}</span>
      <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} disabled={busy}>{DI.trash} {cm.deleteSelected}</button>
      <button type="button" className="btn btn-outline-w btn-sm" onClick={sel.clear} disabled={busy}>{cm.clearSelection}</button>
    </>
  );
}

/** What the confirmation lists: the first names, then how many more. */
export function BulkNames({ names }: { names: string[] }): ReactNode {
  const t = useT();
  const shown = names.slice(0, 5);
  return (
    <span className="cfm-list">
      {shown.map((n, i) => <span key={`${i}:${n}`}>{n}</span>)}
      {names.length > shown.length && <span className="cfm-more">{fmt(t.dash.common.bulkMore, { n: names.length - shown.length })}</span>}
    </span>
  );
}

/** Deleting the selection: `ask` opens the confirmation (the names of what goes), which deletes
    them a few at a time, hands the ones that went to `onRemoved` and says how it went. */
export function useBulkDelete({ sel, nameOf, remove, onRemoved }: { sel: Selection; nameOf: (id: string) => string; remove: (id: string) => Promise<unknown>; onRemoved: (ids: string[]) => void }) {
  const t = useT();
  const cm = t.dash.common;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const num = new Intl.NumberFormat();
  const ids = [...sel.selected];
  const run = async () => {
    setBusy(true);
    const { done, failed } = await runBulk(ids, remove);
    setBusy(false);
    if (done.length) onRemoved(done);
    sel.setMany(done, false);
    if (failed.length) showToast(fmt(cm.bulkFailed, { n: num.format(failed.length) }), "error");
    else showToast(countText(done.length, cm.bulkDoneOne, cm.bulkDoneN, num));
  };
  const dialog = asking ? (
    <ConfirmModal
      title={ids.length === 1 ? cm.bulkTitleOne : fmt(cm.bulkTitle, { n: num.format(ids.length) })}
      body={<BulkNames names={ids.map(nameOf)} />}
      confirmLabel={cm.deleteSelected} cancelLabel={cm.cancel}
      onConfirm={() => { void run(); }} onClose={() => setAsking(false)}
    />
  ) : null;
  return { ask: () => setAsking(true), busy, dialog };
}

/** Runs `fn` over the ids, a few at a time; which went and which did not. */
export async function runBulk(ids: string[], fn: (id: string) => Promise<unknown>, concurrency = 3): Promise<{ done: string[]; failed: string[] }> {
  const done: string[] = [];
  const failed: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try { await fn(id); done.push(id); } catch { failed.push(id); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  return { done, failed };
}
