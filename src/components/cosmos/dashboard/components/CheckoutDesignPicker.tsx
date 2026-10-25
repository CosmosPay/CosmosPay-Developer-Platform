/* CheckoutDesignPicker: choose one of the hosted checkout's prebuilt designs
   (src/lib/payments/checkout-themes.ts) for a payment link. A radio group of thumbnails,
   each with a link to its live preview on the payments site. Names and descriptions are
   the payments catalog's, so the dashboard and payments.cosmospay.lat call them the same. */
import { useId } from "react";
import { useLang, useT } from "@/lib/i18n/index";
import { MESSAGES, isLocale } from "@/lib/payments/i18n";
import { CHECKOUT_THEMES, themeThumbnail, type CheckoutTheme } from "@/lib/payments/checkout-themes";
import { PAYMENTS } from "@/components/cosmos/lib/constants";

interface Props {
  value: CheckoutTheme;
  onChange: (theme: CheckoutTheme) => void;
  disabled?: boolean;
  /** Drop the label and hint (the detail modal draws its own heading). */
  bare?: boolean;
}

export function CheckoutDesignPicker({ value, onChange, disabled = false, bare = false }: Props) {
  const t = useT();
  const lang = useLang();
  const d = t.dash.paylinks.design;
  const names = MESSAGES[isLocale(lang) ? lang : "en"].designs;
  const name = useId();
  return (
    <fieldset className="design-picker" disabled={disabled} aria-label={bare ? d.label : undefined}>
      {!bare && (
        <legend className="design-picker-legend">
          <span>{d.label}</span>
        </legend>
      )}
      <div className="design-grid">
        {CHECKOUT_THEMES.map((theme) => (
          <label key={theme} className={`design-opt${value === theme ? " on" : ""}`}>
            <input type="radio" name={name} value={theme} checked={value === theme} onChange={() => onChange(theme)} />
            <img src={themeThumbnail(theme)} alt="" width="320" height="220" loading="lazy" decoding="async" />
            <span className="design-opt-name">{names[theme].name}</span>
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
