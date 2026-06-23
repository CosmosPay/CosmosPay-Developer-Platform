import { useRef, useEffect } from "react";

/* Returns a ref; invokes `cb` on any mousedown outside the referenced element. */
export function useOutside<T extends HTMLElement = HTMLDivElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return ref;
}
