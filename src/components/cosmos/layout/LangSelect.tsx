import { useId, useRef, useState } from "react";
import { useLang, useT, setLang, LOCALES } from "@/lib/i18n/index";
import { useOutside } from "@/components/cosmos/hooks/useOutside";
import { Flag } from "@/components/cosmos/ui/Flag";
import { IcChev, IcCheck } from "@/components/cosmos/icons";

/* Language selector: flips the active locale live across all islands. A disclosure: the button
   says it opens a list (aria-expanded), the list is plain buttons, each in its own language
   (lang), the current one marked (aria-current); Escape closes it and returns focus. */
export function LangSelect() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const t = useT();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const ref = useOutside(() => setOpen(false));
  const cur = LOCALES.find((l: any) => l.code === lang) || LOCALES[0];
  const close = () => { setOpen(false); button.current?.focus(); };
  return (
    <div className="lang" ref={ref} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); close(); } }}>
      <button type="button" ref={button} className="lang-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id}>
        <span className="flag" aria-hidden="true"><Flag code={cur.flag} /></span><span className="sr-only">{t.nav.language}: </span><span>{cur.label}</span><IcChev open={open} />
      </button>
      <ul className="lang-menu" id={id} role="list" hidden={!open}>
        {LOCALES.map((l: any) => (
          <li key={l.code}>
            <button type="button" lang={l.code} className={`lang-opt${l.code === cur.code ? " active" : ""}`} aria-current={l.code === cur.code ? "true" : undefined} onClick={() => { setLang(l.code); close(); }}>
              <span className="flag" aria-hidden="true"><Flag code={l.flag} /></span><span>{l.name}</span><span className="check" aria-hidden="true"><IcCheck /></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
