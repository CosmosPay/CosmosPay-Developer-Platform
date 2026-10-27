/* Skeletons: grey bars in the shape of what is loading, so the page keeps its layout while data
   arrives. Each one is a polite status that says what is loading; the bars are decoration. */

/* Widths that vary row to row, so a skeleton reads as text rather than a grid of equal bars. */
const WIDTHS = [86, 62, 74, 48, 92, 58, 70, 40];

export function Sk({ w = undefined, className = "", r = 0 }) {
  return <span className={`sk${className ? ` ${className}` : ""}`} aria-hidden="true" style={{ width: w, ["--r" as string]: r }} />;
}

/* A list's rows while it loads: `cols` cells per row, `rows` rows. */
export function TableSkeleton({ label, cols = 5, rows = 6 }) {
  return (
    <div className="sk-table" role="status" aria-busy="true" style={{ ["--sk-cols" as string]: `repeat(${cols}, minmax(0, 1fr))` }}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, r) => (
        <div className="sk-row" key={r} aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => <Sk key={c} r={r} w={`${WIDTHS[(r * 3 + c) % WIDTHS.length]}%`} />)}
        </div>
      ))}
    </div>
  );
}

/* A list whose rows are a status mark and label-over-value pairs (the overview's payments). */
export function ListSkeleton({ label, rows = 5, pairs = 6 }) {
  return (
    <div className="sk-list" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, r) => (
        <div className="sk-item" key={r} aria-hidden="true">
          <Sk className="round" r={r} />
          <div className="sk-pairs" style={{ ["--n" as string]: pairs }}>
            {Array.from({ length: pairs }, (_, c) => (
              <div className="sk-pair" key={c}>
                <Sk className="sm" r={r} w="44%" />
                <Sk r={r} w={`${WIDTHS[(r * 3 + c) % WIDTHS.length]}%`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* A chart's bars while its series loads. */
export function ChartSkeleton({ label, bars = 12 }) {
  return (
    <div className="sk-chart" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: bars }, (_, i) => <span key={i} className="sk" aria-hidden="true" style={{ ["--h" as string]: `${30 + ((i * 37) % 60)}%`, ["--r" as string]: i }} />)}
    </div>
  );
}
