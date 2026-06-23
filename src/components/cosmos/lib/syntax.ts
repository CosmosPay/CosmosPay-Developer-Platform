/* Tiny client-side syntax highlighter for the code/terminal mocks. Returns an
   HTML string of <span class="tok-*"> tokens (used via dangerouslySetInnerHTML). */
export function hl(code: string): string {
  const esc = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /(\/\/[^\n]*|#[^\n]*)|('[^']*'|"[^"]*"|`[^`]*`)|\b(import|from|const|let|new|await|async|return|true|false|True|False|def|print|console|log|require)\b|\b(\d+)\b/g,
    (m, com, str, kw, num) => {
      if (com) return `<span class="tok-com">${com}</span>`;
      if (str) return `<span class="tok-str">${str}</span>`;
      if (kw) return `<span class="tok-kw">${kw}</span>`;
      if (num) return `<span class="tok-num">${num}</span>`;
      return m;
    }
  );
}
