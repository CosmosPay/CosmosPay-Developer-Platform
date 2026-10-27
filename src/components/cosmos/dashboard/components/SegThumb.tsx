/* SegThumb: the pill behind a segmented control's pressed button, sliding from one option to the
   other (product owner, 2026-10-27: the sandbox/production switch animates). Placed first inside
   the control; it measures the pressed button and follows the control's size (a language change
   makes the labels wider). Until it has measured, the pressed button keeps its own fill, so the
   control never shows without one; it slides only after its first placement. */
import { useEffect, useRef, useState } from "react";

export function SegThumb({ on }: { on: unknown }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const measure = () => {
      const pressed = host.querySelector<HTMLElement>('button[aria-pressed="true"]');
      if (pressed) setBox({ x: pressed.offsetLeft, w: pressed.offsetWidth });
    };
    measure();
    const frame = requestAnimationFrame(() => setReady(true));
    const watch = new ResizeObserver(measure);
    watch.observe(host);
    return () => { cancelAnimationFrame(frame); watch.disconnect(); };
  }, [on]);
  return (
    <span
      ref={ref} aria-hidden="true"
      className={`seg-thumb${box ? " on" : ""}${ready ? " ready" : ""}`}
      style={box ? { transform: `translateX(${box.x}px)`, width: box.w } : undefined}
    />
  );
}
