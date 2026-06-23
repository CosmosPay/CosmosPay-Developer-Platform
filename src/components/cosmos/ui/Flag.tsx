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
  };
  return (<svg className="flag-svg" viewBox="0 0 20 14" width="22" height="15" aria-hidden="true">{flags[code]}</svg>);
}
