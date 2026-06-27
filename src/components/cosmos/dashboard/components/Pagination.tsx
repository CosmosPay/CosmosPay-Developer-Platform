import { useT, fmt } from "@/lib/i18n/index";
import { PAGE_SIZE } from "@/components/cosmos/dashboard/data";

export function Pagination({ page, pages, total, start, count, setPage }) {
  const t = useT();
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="pager">
      <span className="pager-range">{fmt(t.dash.pagination.range, { from: start + 1, to: start + count, total })}</span>
      <div className="pager-btns">
        <button className="pager-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.dash.pagination.prev}</button>
        <span className="pager-pages">{page} / {pages}</span>
        <button className="pager-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t.dash.pagination.next}</button>
      </div>
    </div>
  );
}
