/* Lightweight, island-agnostic toast: appends a node directly to <body>, so any
   React island (landing, dashboard…) can flash feedback without a shared provider. */
export function showToast(message: string, type: "success" | "error" = "success") {
  if (typeof document === "undefined") return;
  let host = document.getElementById("cosmos-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "cosmos-toast-host";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type === "error" ? "error" : "success"}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  const icon = type === "error"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  el.innerHTML = icon + "<span></span>";
  const span = el.querySelector("span");
  if (span) span.textContent = message; // textContent → no injection
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  const close = () => { el.classList.remove("in"); el.classList.add("out"); setTimeout(() => el.remove(), 300); };
  setTimeout(close, 2200);
}
