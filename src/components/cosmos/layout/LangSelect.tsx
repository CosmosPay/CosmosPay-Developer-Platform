import { useState } from "react";
import { useLang, setLang, LOCALES } from "@/lib/i18n/index";
import { useOutside } from "../hooks/useOutside";
import { Flag } from "../ui/Flag";
import { IcChev, IcCheck } from "../icons";

/* Language selector — flips the active locale live across all islands. */
export function LangSelect() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const ref = useOutside(() => setOpen(false));
  const cur = LOCALES.find((l: any) => l.code === lang) || LOCALES[0];
  return (
    <div className="lang" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="flag"><Flag code={cur.flag} /></span><span>{cur.label}</span><IcChev open={open} />
      </button>
      {open && (
        <div className="lang-menu" role="listbox">
          {LOCALES.map((l: any) => (
            <button key={l.code} className={`lang-opt${l.code === cur.code ? " active" : ""}`} onClick={() => { setLang(l.code); setOpen(false); }}>
              <span className="flag"><Flag code={l.flag} /></span><span>{l.name}</span><span className="check"><IcCheck /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
