/* A real flag image for a 2-letter country code, matching the dashboard's
   language flags (.flag-svg). Flags are served from flagcdn.com (an external SVG
   CDN) — swap the src for a bundled set later if an external dependency isn't
   desired. Hides itself if the image fails to load. */
export function CountryFlag({ code, className }) {
  if (!code || code.length !== 2) return null;
  return (
    <img
      className={className || "flag-svg"}
      width={22}
      height={15}
      loading="lazy"
      alt=""
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}
