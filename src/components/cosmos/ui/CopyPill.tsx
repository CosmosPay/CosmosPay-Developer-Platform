import { useT } from "@/lib/i18n/index";
import { useCopy } from "../hooks/useCopy";
import { IcCheck, IcCopy } from "../icons";

/* A `$ command` pill that copies its command to the clipboard on click. */
export function CopyPill({ cmd, prefix = "$" }: { cmd: string; prefix?: string }) {
  const t = useT();
  const [done, run] = useCopy();
  return (
    <button type="button" className={`btn btn-ghost-pill copy-pill${done ? " done" : ""}`} onClick={() => run(cmd, t.toasts.copied)} title="Copy to clipboard">
      <code>{prefix} {cmd}</code>
      <span className="copy-ic">{done ? <IcCheck /> : <IcCopy />}</span>
    </button>
  );
}
