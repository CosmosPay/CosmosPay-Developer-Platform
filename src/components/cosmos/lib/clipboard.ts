/* Clipboard copy with a hidden-textarea fallback for non-secure contexts. */
export function copyText(text: string): Promise<void> {
  return new Promise((resolve) => {
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.top = "-9999px"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      } catch (e) {}
      resolve();
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => resolve(), fallback);
      } else { fallback(); }
    } catch (e) { fallback(); }
  });
}
