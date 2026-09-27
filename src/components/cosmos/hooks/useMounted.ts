import { useState, useEffect } from "react";

/* true recien despues del primer render en el cliente. Sirve para no pintar en
   el servidor nada que dependa de localStorage (el tema, por ejemplo): el SSR y
   la hidratacion coinciden, y el valor guardado entra en el segundo render. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
