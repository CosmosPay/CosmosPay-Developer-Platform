/* icons.jsx — feature-local inline icons for the marketing landing. */

export const IcExpand = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H4v5M20 9V4h-5M4 15v5h5M15 20h5v-5" /></svg>);

export const API_ICONS = {
  payments: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>),
  stablecoin: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.2 9.3C13.8 8.5 13 8 12 8c-1.3 0-2.3.8-2.3 1.8 0 2.3 4.6 1.2 4.6 3.6 0 1-1 1.8-2.3 1.8-1 0-1.8-.5-2.2-1.3" /></svg>),
  anchor: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 12a7 7 0 0014 0M5 12H3m16 0h2" /></svg>),
};

export const SDK_ICONS = {
  node: (<svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M10 9l4 3-4 3z" /></svg>),
  web: (<svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3C9.4 5.7 9.4 18.3 12 21" /></svg>),
  python: (<svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" /></svg>),
  go: (<svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3C9.5 5.5 9.5 18.5 12 21" /></svg>),
  ruby: (<svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4c-2.2 0-2 3.2-2 4.5C7 10 6 11 4.5 11 6 11 7 12 7 13.5 7 14.8 6.8 18 9 18M15 4c2.2 0 2 3.2 2 4.5C17 10 18 11 19.5 11 18 11 17 12 17 13.5c0 1.3.2 4.5-2 4.5" /></svg>),
};

export const SOL_ICONS = {
  pay: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>,
  coin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.2 9.3C13.8 8.5 13 8 12 8c-1.3 0-2.3.8-2.3 1.8 0 2.3 4.6 1.2 4.6 3.6 0 1-1 1.8-2.3 1.8-1 0-1.8-.5-2.2-1.3" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3C9.4 5.7 9.4 18.3 12 21" /></svg>,
  ramp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 9l5-5 5 5M7 15l5 5 5-5" /></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M3 7l13-3 2 3" /><circle cx="17" cy="13" r="1.3" /></svg>,
};

/* iconos de las plataformas de la wallet: linea de 1.5px, nunca rellenos */
export const WALLET_ICONS = {
  chrome: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M15.5 12H21M8.9 10.2L4.2 7.5M10.3 14.9L7.5 19.8" /></svg>),
  web: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9h18" /><circle cx="6.4" cy="6.8" r=".6" fill="currentColor" /><circle cx="8.8" cy="6.8" r=".6" fill="currentColor" /></svg>),
  android: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 11a5.5 5.5 0 0111 0v7.5h-11z" /><path d="M8.6 7.2L7.2 4.9M15.4 7.2l1.4-2.3" /><circle cx="9.6" cy="10" r=".7" fill="currentColor" stroke="none" /><circle cx="14.4" cy="10" r=".7" fill="currentColor" stroke="none" /></svg>),
};

/* los dos pasos del bloque para desarrolladores */
export const DEV_ICONS = {
  install: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11M8 10.5l4 4 4-4M4 19h16" /></svg>),
  llms: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5h7a2 2 0 012 2V20a2.6 2.6 0 00-2-1.4H4zM20 5.5h-7a2 2 0 00-2 2V20a2.6 2.6 0 012-1.4h7z" /></svg>),
};
