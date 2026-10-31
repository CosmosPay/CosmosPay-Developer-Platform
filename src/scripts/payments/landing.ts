/* landing.ts: the payments landing's behaviour, shared by every page built from its sections
   (src/components/payments/landing/sections): the hero video, scroll reveals, the digit
   counters, the fee calculator, the pinned sections, the tabs, the live demos, the copy
   buttons and the contact form. Each part looks for its own elements and does nothing on a page without them. */
export function startLanding(): void {
  /* The hero video plays on its own, always: the product owner wants it moving for every
     visitor (reduced-motion included), so it is the one exception to that preference on this
     site. It is paused only while off screen (no work nobody sees) and by its own button,
     which is always there (WCAG 2.2.2: it loops for longer than 5 s). It starts once the page
     has loaded and the browser is idle: until then the poster is the first screen, and the
     video's download does not compete with the fonts, styles and scripts the page needs. */
  const video = document.querySelector<HTMLVideoElement>("[data-hero-video]");
  const button = document.querySelector<HTMLButtonElement>("[data-motion]");
  const label = button?.querySelector<HTMLElement>("[data-motion-label]");
  if (video && button && label) {
    let paused = false;
    let visible = true;
    let started = false;
    const sync = () => {
      if (started && !paused && visible) void video.play().catch(() => { /* autoplay refused: the poster stays */ });
      else video.pause();
      button.setAttribute("aria-pressed", String(paused));
      label.textContent = paused ? button.dataset.play! : button.dataset.pause!;
      button.dataset.state = paused ? "paused" : "playing";
    };
    button.addEventListener("click", () => { paused = !paused; sync(); });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(video);
    sync();
    const start = () => { started = true; sync(); };
    const whenIdle = () => {
      if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 2000 });
      else setTimeout(start, 200);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
  }

  /* Every logo row runs at the same speed (product owner): a row's loop is one set of its logos,
     so its duration is that set's width over MARQUEE_SPEED. Measured again when the web font
     lands and whenever a row changes width; without the script the CSS durations stay. */
  const MARQUEE_SPEED = 48; // px per second
  const tracks = [...document.querySelectorAll<HTMLElement>(".pl-marquee-track")];
  const pace = () => {
    for (const track of tracks) {
      const set = track.querySelector<HTMLElement>(".pl-marquee-set");
      if (set && set.offsetWidth > 0) track.style.animationDuration = `${(set.offsetWidth / MARQUEE_SPEED).toFixed(2)}s`;
    }
  };
  pace();
  void document.fonts?.ready.then(pace);
  if (tracks.length && "ResizeObserver" in window) {
    const watch = new ResizeObserver(pace);
    tracks.forEach((track) => watch.observe(track));
  }

  /* On a phone the section bar scrolls sideways and the current page can sit past its edge:
     bring that link to the middle of the bar, so the visitor sees where they are. */
  const here = document.querySelector<HTMLElement>(".pl-subnav-links [aria-current='page']");
  const bar = here?.closest<HTMLElement>(".pl-subnav-links");
  const centre = () => {
    if (!here || !bar || bar.scrollWidth <= bar.clientWidth) return;
    const link = here.getBoundingClientRect();
    const box = bar.getBoundingClientRect();
    bar.scrollLeft += link.left - box.left - (box.width - link.width) / 2;
  };
  centre();
  // again once the web font is in: it changes every link's width
  void document.fonts?.ready.then(centre);

  /* Scroll reveals: an element marked data-reveal rises in the first time it enters the
     viewport (CSS: payments-landing.css, .pl-anim). Its --i staggers it among siblings. */
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      reveal.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.1 });
  for (const el of document.querySelectorAll("[data-reveal]")) reveal.observe(el);
  (window as Window & { __plReveal?: boolean }).__plReveal = true;

  /* Figures count up digit by digit the first time they come into view: each digit is a
     strip of 0–9 that spins a few turns and settles, the strips easing in one after another
     from left to right. The figure's text stays readable to assistive tech (a visually hidden
     copy); the strips are hidden from it. Figures whose text changes later (the calculator)
     simply get the new text. */
  const ODO_TURNS = 2;
  const odometer = (el: HTMLElement) => {
    const text = el.textContent ?? "";
    if (!/\d/.test(text)) return;
    const reader = document.createElement("span");
    reader.className = "pl-sr";
    reader.textContent = text;
    const face = document.createElement("span");
    face.className = "pl-odo";
    face.setAttribute("aria-hidden", "true");
    let n = 0;
    for (const ch of text) {
      // every character is its own box: a bare space in a flex row would collapse
      if (!/\d/.test(ch)) { const glyph = document.createElement("span"); glyph.textContent = ch; face.append(glyph); continue; }
      const cell = document.createElement("span");
      cell.className = "pl-odo-d";
      const strip = document.createElement("span");
      strip.className = "pl-odo-s";
      const target = ODO_TURNS * 10 + Number(ch);
      for (let d = 0; d <= target; d++) {
        const digit = document.createElement("span");
        digit.textContent = String(d % 10);
        strip.append(digit);
      }
      strip.style.setProperty("--to", String(target));
      strip.style.setProperty("--k", String(n++));
      cell.append(strip);
      face.append(cell);
    }
    el.replaceChildren(reader, face);
    requestAnimationFrame(() => requestAnimationFrame(() => face.classList.add("is-on")));
  };
  const counted = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      odometer(entry.target as HTMLElement);
      counted.unobserve(entry.target);
    }
  }, { threshold: 0.6 });

  /* Fee calculator: the amount (typed or slid) times each plan's rate, plus its fixed cents,
     plus escrow's surcharge when ticked; what the merchant keeps is the rest. Rates come from the
     rows' data attributes (plans.ts); a custom plan keeps its label. The slider is logarithmic
     (1 to 10,000 over 0–100), so small and large payments both get room on it. */
  for (const calc of document.querySelectorAll<HTMLElement>("[data-calc]")) {
    const amount = calc.querySelector<HTMLInputElement>("[data-calc-amount]")!;
    const range = calc.querySelector<HTMLInputElement>("[data-calc-range]")!;
    const escrow = calc.querySelector<HTMLInputElement>("[data-calc-escrow]")!;
    const escrowPct = Number(calc.dataset.escrowPct) || 0;
    const money = new Intl.NumberFormat(document.documentElement.lang || "en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const render = () => {
      const value = Math.max(0, Number(amount.value) || 0);
      for (const row of calc.querySelectorAll<HTMLElement>("[data-calc-plan]")) {
        if (row.dataset.pct === "") continue;
        const pct = Number(row.dataset.pct) + (escrow.checked ? escrowPct : 0);
        const fee = value * pct / 100 + Number(row.dataset.cents) / 100;
        row.querySelector("[data-calc-fee]")!.textContent = money.format(fee) + " USDC";
        row.querySelector("[data-calc-net]")!.textContent = money.format(Math.max(0, value - fee)) + " USDC";
      }
    };
    const toRange = (value: number) => String(Math.min(100, Math.max(0, 25 * Math.log10(Math.max(1, value)))));
    const fromRange = (position: number) => {
      const value = 10 ** (position / 25);
      return value < 100 ? Math.round(value) : value < 1000 ? Math.round(value / 5) * 5 : Math.round(value / 50) * 50;
    };
    // the slider's fill follows the thumb; its spoken value is the amount, not the position
    const sync = () => {
      range.setAttribute("aria-valuetext", `${amount.value || 0} USDC`);
      range.parentElement!.style.setProperty("--pos", String(Number(range.value) / 100));
    };
    amount.addEventListener("input", () => { range.value = toRange(Number(amount.value) || 0); sync(); render(); });
    range.addEventListener("input", () => { amount.value = String(fromRange(Number(range.value))); sync(); render(); });
    escrow.addEventListener("change", render);
    render();
  }
  for (const el of document.querySelectorAll("[data-odo]")) counted.observe(el);

  /* Pinned sections (data-pin): on a screen big enough to hold one whole, the section's stage
     sticks under the nav while the page scrolls through a runway of --n steps, and the scroll
     position picks the current step; past the last one the page scrolls on. The runway is
     plain CSS height and the stage plain position: sticky, so nothing hijacks the wheel or the
     keyboard. A tab inside a pinned section scrolls to its own step instead. */
  /* where a stage sticks: under the nav (73px), or under the nav and the section bar */
  const stickTop = (pin: Pin) => parseFloat(getComputedStyle(pin.stage).top) || 73;
  const pinQuery = matchMedia("(min-width: 1000px) and (min-height: 700px)");
  type Pin = { section: HTMLElement; runway: HTMLElement; stage: HTMLElement; n: number; at: number; onStep?: (i: number) => void };
  const pinned: Pin[] = [];
  for (const section of document.querySelectorAll<HTMLElement>("[data-pin]")) {
    const runway = section.querySelector<HTMLElement>(".pl-pin")!;
    const stage = section.querySelector<HTMLElement>(".pl-pin-stage")!;
    const n = Number(getComputedStyle(section).getPropertyValue("--n")) || 1;
    pinned.push({ section, runway, stage, n, at: -1 });
  }
  const stepOf = (pin: Pin) => {
    const travel = pin.runway.offsetHeight - pin.stage.offsetHeight;
    const p = travel > 0 ? Math.min(1, Math.max(0, (stickTop(pin) - pin.runway.getBoundingClientRect().top) / travel)) : 0;
    return { p, step: Math.min(pin.n - 1, Math.floor(p * pin.n)) };
  };
  const scrollToStep = (pin: Pin, i: number) => {
    const travel = pin.runway.offsetHeight - pin.stage.offsetHeight;
    const top = pin.runway.getBoundingClientRect().top + window.scrollY - stickTop(pin);
    window.scrollTo({ top: top + travel * ((i + 0.5) / pin.n), behavior: "smooth" });
  };
  const paintPins = () => {
    for (const pin of pinned) {
      if (!pin.section.classList.contains("is-pinned")) continue;
      const { p, step } = stepOf(pin);
      pin.section.style.setProperty("--p", p.toFixed(4));
      // each bar segment fills with its own stretch of the runway
      pin.section.querySelectorAll<HTMLElement>(".pl-pin-bar i").forEach((bar, i) => {
        bar.style.setProperty("--f", Math.min(1, Math.max(0, p * pin.n - i)).toFixed(3));
      });
      if (step === pin.at) continue;
      pin.at = step;
      pin.section.querySelectorAll<HTMLElement>("[data-pin-item]").forEach((item, i) => {
        item.classList.toggle("is-reached", i <= step);
        item.classList.toggle("is-current", i === step);
      });
      const count = pin.section.querySelector<HTMLElement>("[data-pin-count]");
      if (count) count.textContent = (count.dataset.template ?? "").replace("{n}", String(step + 1)).replace("{total}", String(pin.n));
      pin.onStep?.(step);
    }
  };
  const setPinMode = () => {
    for (const pin of pinned) {
      pin.section.classList.toggle("is-pinned", pinQuery.matches);
      pin.at = -1;
      if (!pinQuery.matches) pin.section.querySelectorAll("[data-pin-item]").forEach((item) => item.classList.remove("is-reached", "is-current"));
    }
    paintPins();
  };
  let pinFrame = 0;
  window.addEventListener("scroll", () => { if (!pinFrame) pinFrame = requestAnimationFrame(() => { pinFrame = 0; paintPins(); }); }, { passive: true });
  window.addEventListener("resize", paintPins);
  pinQuery.addEventListener("change", setPinMode);

  /* Tabs for the use cases and the code samples (WAI-ARIA tabs, automatic activation):
     a click or an arrow key selects a tab and shows its panel; Home and End jump to the first
     and last. Only the selected tab is in the tab order. Inside a pinned section the scroll
     position drives them too, and choosing one scrolls to its step. */
  for (const root of document.querySelectorAll<HTMLElement>("[data-tabs]")) {
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const pin = pinned.find((x) => x.section.contains(root) && root.hasAttribute("data-pin-tabs"));
    const select = (tab: HTMLButtonElement, focus: boolean) => {
      for (const other of tabs) {
        const on = other === tab;
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(other.getAttribute("aria-controls")!);
        if (panel) panel.hidden = !on;
      }
      if (focus) tab.focus();
    };
    const choose = (tab: HTMLButtonElement, focus: boolean) => {
      select(tab, focus);
      if (pin && pin.section.classList.contains("is-pinned")) scrollToStep(pin, tabs.indexOf(tab));
    };
    if (pin) pin.onStep = (i) => { if (tabs[i] && tabs[i].getAttribute("aria-selected") !== "true") select(tabs[i], false); };
    root.addEventListener("click", (event) => {
      const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
      if (tab) choose(tab, false);
    });
    root.addEventListener("keydown", (event) => {
      const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (at < 0) return;
      const next = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      choose(tabs[(next + tabs.length) % tabs.length], true);
    });
  }
  setPinMode();

  /* The live demos (the embed's demo mode) follow the page's theme, and the embedded one's
     events are written out under it, as a merchant's page would receive them. */
  const demoTheme = () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    for (const el of document.querySelectorAll("[data-demo-theme]")) el.setAttribute("theme", theme);
  };
  demoTheme();
  new MutationObserver(demoTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  for (const demo of document.querySelectorAll<HTMLElement>("[data-demo-events]")) {
    const log = demo.parentElement?.querySelector<HTMLElement>("[data-demo-log]");
    demo.addEventListener("cosmospay:status", (event) => {
      const { status } = (event as CustomEvent<{ status: string }>).detail;
      if (log) log.textContent = status === "SUCCEEDED" ? "cosmospay:paid · SUCCEEDED" : `cosmospay:status · ${status}`;
    });
  }

  /* Copy buttons: data-copy names the code block to copy; data-copy-panel copies the block in
     the selected panel of its tabs. The label says it worked for two seconds; a live region
     reads it out. */
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy], [data-copy-panel]")) {
    const label = button.querySelector<HTMLElement>("[data-copy-label]")!;
    const idle = label.textContent ?? "";
    label.setAttribute("aria-live", "polite");
    let timer = 0;
    button.addEventListener("click", async () => {
      const block = button.dataset.copy
        ? document.getElementById(button.dataset.copy)
        : button.closest("[data-tabs]")?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden]) [data-raw]');
      const raw = block?.dataset.raw;
      if (!raw) return;
      try {
        await navigator.clipboard.writeText(raw);
        label.textContent = button.dataset.copied ?? idle;
        button.classList.add("is-done");
        clearTimeout(timer);
        timer = window.setTimeout(() => { label.textContent = idle; button.classList.remove("is-done"); }, 2000);
      } catch { /* clipboard refused (permissions, insecure context): the code stays selectable */ }
    });
  }

  /* The contact form (FinalCta.astro) posts in place: the page stays put, the button says it
     is sending, wrong fields are marked and named, and the answer is read out from the live
     region under the form. Without this script the form posts normally and the page comes
     back at the form with the outcome. */
  for (const form of document.querySelectorAll<HTMLFormElement>("[data-contact]")) {
    const status = form.querySelector<HTMLElement>("[data-contact-status]")!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const idle = submit.textContent ?? "";
    const say = (state: string, text: string) => {
      if (state) status.dataset.state = state;
      else delete status.dataset.state;
      status.textContent = text;
    };
    const mark = (wrong: string[]) => {
      for (const note of form.querySelectorAll<HTMLElement>("[data-error-for]")) {
        const name = note.dataset.errorFor!;
        const bad = wrong.includes(name);
        note.hidden = !bad;
        note.textContent = bad ? note.dataset.message ?? "" : "";
        form.querySelector(`[name="${name}"]`)?.setAttribute("aria-invalid", String(bad));
      }
    };
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true;
      submit.textContent = form.dataset.sending ?? idle;
      say("", "");
      try {
        const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        const { status: outcome, errors = [] } = (await res.json()) as { status: string; errors?: string[] };
        mark(errors);
        say(outcome, form.dataset[outcome] ?? form.dataset.failed ?? "");
        if (outcome === "sent") form.reset();
        else if (outcome === "invalid") form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      } catch {
        say("failed", form.dataset.failed ?? "");
      } finally {
        submit.disabled = false;
        submit.textContent = idle;
      }
    });
  }
}
