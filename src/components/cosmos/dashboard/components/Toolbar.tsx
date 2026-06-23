import { DI } from "../icons";

export function Toolbar({ q, setQ, placeholder, children }) {
  return (<div className="toolbar"><div className="tb-search">{DI.search}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder || "Search…"} /></div><div className="tb-actions">{children}</div></div>);
}
