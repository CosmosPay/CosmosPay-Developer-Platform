import type { ReactElement } from "react";

/* Small inline SVG flag tiles, keyed by locale (see LOCALES in the i18n store). */
export function Flag({ code }: { code: string }) {
  const flags: Record<string, ReactElement> = {
    // English → United States
    EN: (<g><rect width="20" height="14" fill="#fff" />{[0, 2.154, 4.308, 6.462, 8.615, 10.77, 12.92].map((y) => <rect key={y} y={y} width="20" height="1.077" fill="#B22234" />)}<rect width="8.4" height="7.54" fill="#3C3B6E" /><g fill="#fff"><circle cx="1.7" cy="1.5" r="0.48" /><circle cx="4.2" cy="1.5" r="0.48" /><circle cx="6.7" cy="1.5" r="0.48" /><circle cx="2.95" cy="3" r="0.48" /><circle cx="5.45" cy="3" r="0.48" /><circle cx="1.7" cy="4.5" r="0.48" /><circle cx="4.2" cy="4.5" r="0.48" /><circle cx="6.7" cy="4.5" r="0.48" /><circle cx="2.95" cy="6" r="0.48" /><circle cx="5.45" cy="6" r="0.48" /></g></g>),
    // Español → Argentina
    ES: (<g><rect width="20" height="14" fill="#74ACDF" /><rect y="4.66" width="20" height="4.67" fill="#fff" /><circle cx="10" cy="7" r="1.5" fill="#F6B40E" /></g>),
    // Português → Brasil
    PT: (<g><rect width="20" height="14" fill="#009C3B" /><polygon points="10,1.4 18.6,7 10,12.6 1.4,7" fill="#FFDF00" /><circle cx="10" cy="7" r="2.6" fill="#002776" /></g>),
    FR: (<g><rect width="20" height="14" fill="#fff" /><rect width="6.7" height="14" fill="#0055A4" /><rect x="13.3" width="6.7" height="14" fill="#EF4135" /></g>),
    DE: (<g><rect width="20" height="14" fill="#FFCE00" /><rect width="20" height="4.66" fill="#000" /><rect y="4.66" width="20" height="4.66" fill="#DD0000" /></g>),
    // हिन्दी → India
    IN: (<g><rect width="20" height="14" fill="#fff" /><rect width="20" height="4.66" fill="#FF9933" /><rect y="9.34" width="20" height="4.66" fill="#138808" /><circle cx="10" cy="7" r="1.7" fill="none" stroke="#000080" strokeWidth="0.45" /><circle cx="10" cy="7" r="0.35" fill="#000080" /></g>),
    // 中文 → China
    CN: (<g><rect width="20" height="14" fill="#EE1C25" /><g fill="#FFFF00"><polygon points="3.60,1.30 4.12,2.89 5.79,2.89 4.44,3.87 4.95,5.46 3.60,4.48 2.25,5.46 2.76,3.87 1.41,2.89 3.08,2.89" /><polygon points="6.18,1.82 6.51,1.39 6.20,0.94 6.72,1.13 7.05,0.69 7.04,1.24 7.55,1.42 7.03,1.57 7.01,2.12 6.70,1.67" /><polygon points="7.27,2.77 7.74,2.49 7.62,1.96 8.03,2.31 8.49,2.04 8.28,2.54 8.69,2.90 8.15,2.85 7.93,3.35 7.81,2.82" /><polygon points="7.26,4.18 7.80,4.10 7.88,3.56 8.13,4.04 8.67,3.96 8.28,4.35 8.53,4.83 8.04,4.58 7.66,4.97 7.74,4.43" /><polygon points="6.16,5.20 6.69,5.33 6.98,4.87 7.02,5.42 7.55,5.55 7.04,5.75 7.08,6.30 6.73,5.88 6.23,6.08 6.51,5.62" /></g></g>),
  };
  return (<svg className="flag-svg" viewBox="0 0 20 14" width="22" height="15" aria-hidden="true">{flags[code]}</svg>);
}
