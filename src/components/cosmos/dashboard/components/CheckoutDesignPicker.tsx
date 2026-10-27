/* CheckoutDesignPicker: choose one of the hosted checkout's prebuilt designs
   (src/lib/payments/checkout-themes.ts) for a payment link. A radio group of thumbnails,
   each with a link to its live preview on the payments site. Names and descriptions are
   the payments catalog's, so the dashboard and payments.cosmospay.lat call them the same.
   The chosen one says so in words and with a check on its thumbnail (product owner: people
   must see which design the link has now); the radio already tells assistive tech. */
import { useId } from "react";
import { useLang, useT } from "@/lib/i18n/index";
import { MESSAGES, isLocale } from "@/lib/payments/i18n";
import { CHECKOUT_THEMES, themeThumbnail, type CheckoutTheme } from "@/lib/payments/checkout-themes";
import { PAYMENTS } from "@/components/cosmos/lib/constants";

interface Props {
  value: CheckoutTheme;
  onChange: (theme: CheckoutTheme) => void;
  disabled?: boolean;
  /** Drop the label and hint (the payment's view draws its own heading). */
  bare?: boolean;
  /** Small options in one row, no descriptions (product owner: the options were too big). */
  compact?: boolean;
}

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export function CheckoutDesignPicker({ value, onChange, disabled = false, bare = false, compact = false }: Props) {
  const t = useT();
  const lang = useLang();
  const d = t.dash.paylinks.design;
  const names = MESSAGES[isLocale(lang) ? lang : "en"].designs;
  const name = useId();
  return (
    <fieldset className={compact ? "design-picker compact" : "design-picker"} disabled={disabled} aria-label={bare ? d.label : undefined}>
      {!bare && (
        <legend className="design-picker-legend">
          <span>{d.label}</span>
        </legend>
      )}
      <div className="design-grid">
        {CHECKOUT_THEMES.map((theme) => (
          <label key={theme} className={`design-opt${value === theme ? " on" : ""}`}>
            <input type="radio" name={name} value={theme} checked={value === theme} onChange={() => onChange(theme)} />
            <span className="design-opt-thumb">
              <img src={themeThumbnail(theme)} alt="" width="320" height="220" loading="lazy" decoding="async" />
              {value === theme && <span className="design-opt-check" aria-hidden="true">{CHECK}</span>}
            </span>
            <span className="design-opt-name">{names[theme].name}</span>
            {value === theme && <span className="design-opt-sel" aria-hidden="true">{CHECK}{d.selected}</span>}
            <span className="design-opt-desc">{names[theme].desc}</span>
            <a className="design-opt-preview" href={`${PAYMENTS}/preview/${theme}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
              {d.preview} ↗
            </a>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
