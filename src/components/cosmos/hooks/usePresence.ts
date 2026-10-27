import { useEffect, useState } from "react";

/* Keeps a popup present while it plays its closing animation. `mounted` stays true for `ms`
   after `open` turns false; `state` ("open" | "closing" | "closed") goes on the element as
   data-state for the CSS. A popup that must stay in the page (crawlable links) renders always
   and takes `hidden={!mounted}`; one that may leave it renders only while `mounted`. */
export function usePresence(open: boolean, ms = 140) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closing" | "closed">(open ? "open" : "closed");
  useEffect(() => {
    if (open) { setMounted(true); setState("open"); return; }
    if (!mounted) return;
    setState("closing");
    const h = setTimeout(() => { setMounted(false); setState("closed"); }, ms);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return { mounted, state };
}
