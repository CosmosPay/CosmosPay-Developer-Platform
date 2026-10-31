/* Pagination: under every table, how many rows a page shows (PAGE_SIZES, at most 50; one choice
   for every table, usePaged), the range on screen and, when there is more than one page, the
   steps between them. Takes usePaged's result as it is ({...pg}); `children` close the row (a link
   to the whole list). */
import type { ReactNode } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { PAGE_SIZES } from "@/components/cosmos/dashboard/data";
import { Select } from "@/components/cosmos/dashboard/components/Select";

export function Pagination({ page, pages, total, start, count, setPage, size, setSize, children = null }: { page: number; pages: number; total: number; start: number; count: number; setPage: (n: number) => void; size: number; setSize: (n: number) => void; children?: ReactNode }) {
  const t = useT();
  const pt = t.dash.pagination;
  return (
    <div className="pager">
      <div className="pager-size">
        <span className="pager-size-k" aria-hidden="true">{pt.rows}</span>
        <Select
          variant="filter"
          className="pager-dd"
          label={pt.rows}
          value={String(size)}
          onChange={(v) => setSize(Number(v))}
          options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
        />
      </div>
      {total > 0 && <span className="pager-range">{fmt(pt.range, { from: start + 1, to: start + count, total })}</span>}
      {pages > 1 && (
        <div className="pager-btns">
          <button className="pager-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>{pt.prev}</button>
          <span className="pager-pages">{page} / {pages}</span>
          <button className="pager-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>{pt.next}</button>
        </div>
      )}
      {children}
    </div>
  );
}
