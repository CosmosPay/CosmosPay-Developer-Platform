/* FillRows: a table keeps its height whatever it holds (product owner: a short or empty list must
   not shrink the table). Placed at the end of a <tbody>, it draws the page's missing rows empty,
   each as tall as a real row of the same table (measured, since rows differ from table to table;
   a one-line row's height when the page has none). An empty list stays empty (product owner: no
   "nothing here" text or action inside the table; the view's buttons are in its filter row);
   `empty` is only for a list that could not load, said in the middle row. The empty rows are
   hidden from assistive tech; the message is not.
   Usage: <FillRows n={pg.size - pg.count} cols={5} empty={error ? text : null} /> */
import { useLayoutEffect, useRef, type ReactNode } from "react";

export function FillRows({ n, cols, empty = null }: { n: number; cols: number; empty?: ReactNode }) {
  const first = useRef<HTMLTableRowElement>(null);
  useLayoutEffect(() => {
    const row = first.current;
    const body = row?.parentElement;
    if (!row || !body) return;
    const real = body.querySelector<HTMLTableRowElement>(":scope > tr:not(.row-fill)");
    const h = real ? real.getBoundingClientRect().height : 0;
    if (h > 0) body.style.setProperty("--fill-h", `${Math.round(h * 10) / 10}px`);
    else body.style.removeProperty("--fill-h");
  });
  if (n <= 0) return null;
  const mid = empty ? Math.floor((n - 1) / 2) : -1;
  return (
    <>
      {Array.from({ length: n }, (_, i) =>
        i === mid ? (
          <tr key={i} ref={i === 0 ? first : undefined} className="row-fill row-empty">
            <td colSpan={cols}><div className="row-empty-msg">{empty}</div></td>
          </tr>
        ) : (
          <tr key={i} ref={i === 0 ? first : undefined} className="row-fill" aria-hidden="true"><td colSpan={cols} /></tr>
        ),
      )}
    </>
  );
}
