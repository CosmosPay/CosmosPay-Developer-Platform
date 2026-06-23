import { useState, useRef } from "react";
import { copyText } from "../lib/clipboard";
import { showToast } from "../ui/toast";

/* Copy-to-clipboard with a transient "done" flag (for check-mark feedback) and an
   optional toast. Returns [done, run(text, toastMsg?)]. */
export function useCopy() {
  const [done, setDone] = useState(false);
  const tref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const run = (text: string, toastMsg?: string) => {
    copyText(text).then(() => {
      setDone(true);
      if (toastMsg) showToast(toastMsg);
      if (tref.current) clearTimeout(tref.current);
      tref.current = setTimeout(() => setDone(false), 1600);
    });
  };
  return [done, run] as const;
}
