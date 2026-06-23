import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IcCheck } from "@/components/cosmos/shared";

/* Compact custom dropdown matching the platform's menus (not a native <select>, whose
   option list can't be styled). The menu is portaled to <body> and positioned with
   position:fixed off the button's rect, so it lands exactly under the button and is never
   clipped (or mis-placed by a transformed ancestor). options: [{ value, label }]. */
export function MiniSelect({ value, options, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const cur = options.find((o) => o.value === value);

  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: Math.round(r.bottom + 4), left: Math.round(r.left), minWidth: Math.round(r.width) });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    // A fixed menu would detach on scroll/resize — just close it.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="msel">
      <button type="button" ref={btnRef} className={`msel-btn${open ? " open" : ""}`} onClick={toggle} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
        <span>{cur ? cur.label : value}</span>
        <svg className="msel-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="msel-menu" role="listbox" style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth }}>
          {options.map((o) => (
            <button key={o.value} type="button" className={`msel-opt${o.value === value ? " active" : ""}`} onClick={() => { onChange(o.value); setOpen(false); }}>
              <span>{o.label}</span>{o.value === value && <IcCheck />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
