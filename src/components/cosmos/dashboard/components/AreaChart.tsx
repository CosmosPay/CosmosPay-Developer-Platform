export function AreaChart({ data }) {
  const w = 640, h = 200, pad = 8, max = Math.max(...data), min = Math.min(...data) * 0.92;
  const x = (i) => (i / (data.length - 1)) * w, y = (v) => h - ((v - min) / (max - min || 1)) * (h - pad * 2) - pad;
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--violet)" stopOpacity="0.30" /><stop offset="1" stopColor="var(--violet)" stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" y1={h * g} x2={w} y2={h * g} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="url(#ag)" />
      <polyline points={line} fill="none" stroke="var(--violet)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
