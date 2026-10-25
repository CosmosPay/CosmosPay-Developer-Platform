/* ink.ts — the buttons' hover fill, after the Stellar Snap's landing: a circle of ink grows
 * from the point where the pointer entered until it paints the whole button, then shrinks
 * back towards where it left (the CSS is `.btn::before` in cosmos.css).
 *
 * One delegated listener per document, so it covers every `.btn` on the page, including the
 * ones React islands render later. It only sets the circle's centre (--ink-x/--ink-y) and a
 * size that reaches the farthest corner (--ink-size); without them (keyboard focus) the CSS
 * grows the circle from the centre.
 */

const SELECTOR = ".btn";

function place(button: HTMLElement, event: PointerEvent) {
  const rect = button.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
  button.style.setProperty("--ink-x", `${x}px`);
  button.style.setProperty("--ink-y", `${y}px`);
  button.style.setProperty("--ink-size", `${2 * radius}px`);
}

export function installInk(root: Document = document) {
  const onCross = (event: PointerEvent) => {
    const button = (event.target as Element | null)?.closest?.<HTMLElement>(SELECTOR);
    if (!button) return;
    // Moving between the button's own children is not entering or leaving it.
    const other = event.relatedTarget as Node | null;
    if (other && button.contains(other)) return;
    place(button, event);
  };
  root.addEventListener("pointerover", onCross);
  root.addEventListener("pointerout", onCross);
}
