import { DI } from "@/components/cosmos/dashboard/icons";
import { useT } from "@/lib/i18n/index";

export function Toolbar({ q, setQ, placeholder, children }) {
  const t = useT();
  return (<div className="toolbar"><div className="tb-search">{DI.search}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder || t.ui.searchEllipsis} aria-label={placeholder || t.ui.search} /></div><div className="tb-actions">{children}</div></div>);
}
