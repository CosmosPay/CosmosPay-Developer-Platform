# Cosmos Pay web design pattern

The rules every screen of the three domains follows: the company site, the payments gateway and the
dashboard. They come from the product owner's standing rules (CLAUDE.md, which wins on any
conflict) and from an audit with the `design-taste-frontend` skill's checkers (2026-11-06: consistency,
layout and performance at 1440, 1024, 820, 768 and 390 on fifteen pages). A change that breaks a rule
here is a bug; a rule that should change is changed here first.

| Surface | Host | Skin | Stylesheets |
|---|---|---|---|
| Company site (landing, /pricing, /about, /swaps) | cosmospay.lat | Brand skin (BRAND.md: black and navy panels, white canvas) | `cosmos.css`, `views.css` |
| Payments gateway (landing, content pages, guides, checkout) | payments.cosmospay.lat | Institutional skin (`body.inst`) | `cosmos.css`, `institutional.css`, `payments-landing.css` |
| Dashboard and platform | dev.cosmospay.lat | Institutional skin | `cosmos.css`, `institutional.css`, `dashboard.css`, `views.css` |

## 1. Colour

One token set per skin, redeclared for dark mode and for dark panels. Components read roles, never a hex.

| Role | Brand skin (light) | Institutional skin (light / dark) | Use |
|---|---|---|---|
| `--bg` | #FFFFFF | #F6F6F7 / #0C0C10 | page canvas |
| `--surface` | #FFFFFF | #FFFFFF / #15151B | cards, panels, dialogs, menus |
| `--surface-2` | 4% black | #F1F1F3 / #1C1C24 | wells, hovered rows, quiet fills |
| `--ink` | #000000 | #13131A / #F2F2F5 | text, icons, the primary fill |
| `--ink-2` | 66% black | #4A4A55 / #B4B4BE | running text beside a heading, secondary text |
| `--ink-3` | 56% black | #6A6A75 / #92929D | labels, meta, placeholders, dates; never running text |
| `--line` / `--line-2` | 12% / 20% black | #E6E6EA / #D2D2D8 | hairlines / field borders and hover lines |
| `--btn-bg` / `--btn-fg` | navy / white | #13131A / white (inverted in dark) | the one filled button |
| `--tertiary` | none | #2346F4 / #8FA3FF | focus rings, the light buttons' ink, charts, progress |
| Status | `--viz-done`, `--viz-wait`, `--viz-fail` | green, amber, red, own dark steps | status marks and words, charts |

- Black is primary on the institutional skin, neutral greys secondary, the corporate blue tertiary.
  On the brand skin the navy is the primary button on white and white the primary on dark panels.
- Never violet, never gradients, no decorative chips. Status is a mark and a word, never colour alone.
- Dark mode is one palette on every surface: the dashboard's (institutional.css). The payments
  landing redefines no colour in dark; its alternate sections are `--surface`, its cards and lines
  the dashboard's.
- Contrast: running text 7:1 where it can be, 4.5:1 the floor; labels and meta 4.5:1; large text and
  marks 3:1. Code windows keep comments and punctuation at 7:1 on their dark surface.

## 2. Type

One family, Open Sauce One (`--ff-sans`); Cosmos Lazos only for the logo; a monospace stack for code.

- **The heading level is the visual level.** One h1 per page and it is the largest heading on it, at
  every width; a section h2 never outgrows it (company site: h2 `clamp(2.25rem, 5vw, 4rem)`, on a
  phone `clamp(2rem, 9vw, 2.25rem)`), a card's h3 never outgrows the section's h2, and a figure on a
  card (a plan's price) stays under the h1 on a phone.
- **Brand skin:** display headings at weight 300, line height 1.0, tight tracking, `text-wrap: balance`;
  body 16 to 17px at 1.55.
- **Gateway:** hero h1 `clamp(32px, 4.2vw + 8px, 60px)`, page h1 `clamp(36px, 3.6vw + 8px, 56px)`,
  section h2 `clamp(32px, 3.3vw, 40px)`, h3 22, body 17, small 14; weight 600.
- **Dashboard scale:**

| Step | Size / line height | Use |
|---|---|---|
| caption | 12 / 1.4 | axis ticks, legends, timestamps, badges: the floor, nothing smaller |
| label | 13 / 1.4 | field labels, table heads, menu hints |
| body-s | 14 / 1.5 | table cells, menus, dense lists, fields on a desktop |
| body | 16 / 1.55 | dialogs, FAQ answers, fields on a touch screen |
| title-s | 18 / 1.3 | panel titles, the swap form's title |
| section | 20 | a second list's heading on a page (`hub-section`) |
| title | 24 / 1.15 | the page title and dialog titles |
| figure | 28 to 34 / 1.1 | metrics and the swap amounts |

- Sentence case everywhere: no uppercase labels, no tracked capitals.
- Paragraphs and list items `text-wrap: pretty` (no word alone on a last line); headings `balance`.
- Numbers that line up use tabular figures.

## 3. Space

- A 4px base. Use 4, 8, 12, 16, 24, 32, 48, 64, 96 and 128; 6, 10 and 14 only inside dense controls.
- Sections: brand skin `.lp-panel` 128px top and bottom (80 on a phone); gateway sections
  `clamp(80px, 10vw, 136px)`; two sections on one ground share one gap. A section following another
  never starts closer than 64px.
- Heading to content: 48 to 96px on the sites (56 on a phone); 16 to 24px in the dashboard.
- Fixed controls over a scrolling list (a picker's search and filter) keep 14px of space above it.
- Containers: `.wrap` up to 1440px with 40px gutters (16 on a phone); the dashboard's column fills
  the shell beside the sidebar. Left and right content edges match.

## 4. Shape and elevation

- Institutional radii (`.inst` tokens): field 12, list item 10, popover and well 16, card and panel 20,
  dialog 24; every button, segment, search and filter a pill. Brand skin: 16 and 24, pill buttons.
- Cards rest flat (a 1px line); menus, popovers and dialogs take `--shadow-lg`. Two boxes deep at most.

## 5. Components

- **Buttons:** a pill with a 1.5px outline, two sizes (regular about 46px, `btn-sm` about 38px), and one
  size per row of buttons (a row beside a command pill matches its height). Primary filled, secondary
  soft or outlined, danger. One filled primary per view or dialog. On a phone a closing row's buttons
  take the full width. Labels are a verb and an object.
- **Touch:** on a coarse pointer every control is at least 44px (icon buttons, menus, pagers, filters,
  small buttons); a copy chip beside an id 32px.
- **Fields:** label above (13/600), help under it (12.5px, linked with `aria-describedby`); 42px high
  and 14px text with a mouse, 44px and 16px on a touch screen (iOS zooms into anything smaller);
  focus darkens the line and adds the tertiary ring; an invalid field says why in words.
- **Tables (the Payments table):** figures first, the filter row with the view's buttons, a row that
  opens its detail, the id as a `RecordLink` (on a phone the id shortens and its copy button stays
  beside it), a date column, icon actions then the "⋮" menu, empty rows keep the height, pages.
- **Figures:** a row of tabs over a chart scrolls sideways on a phone; a figure strip with no chart
  (`ViewFigures`) wraps two to a row so every figure is in sight.
- **Dialogs:** title 24px, close in the corner, Escape answers from the top dialog; every create is a
  dialog, long forms in steps, every delete confirms.
- **Pickers** (tokens, currencies, networks): title; search and filter in one row; 14px; the list
  (mark, name over its network, value on the right); arrow keys between rows; counts announced to
  assistive tech, never written.
- **Disclosures** (FAQ answers, folded details) open to their content's height
  (`grid-template-rows: 0fr` to `1fr`), never a fixed `max-height` a long answer outgrows.
- **Token and network marks:** official artwork from the generated manifest
  (`src/lib/token-logos.ts`), the network's mark as a badge; a P2P ramp token without artwork shows
  the logo its list names, else its two-letter monogram.
- **Code windows:** highlighted tokens; on a phone the bar drops its window dots and the copy button
  shows its icon only (its word stays its accessible name).
- **Navigation:** the general nav on every page; the dashboard sidebar with groups as a dashed tree.

## 6. Motion

- The product owner's rules: motion runs for everyone, reduced-motion settings included; the
  landing's reveals, pinned stages, odometers, marquees and the hero video are wanted.
- Every control answers the pointer (the buttons' ink, a sweep underline on links, a hover fill on
  rows); a card that is a link lifts at most 2px. UI moves 140 to 300ms, entrances 400 to 600ms,
  transform and opacity only.
- Images in a moving row load with the page, never lazily (a marquee showed empty frames).

## 7. Copy

- Headings name the thing; buttons are a verb and an object; one wording per action; sentence case;
  no em dash; no provider names; only checkable claims; no empty-state text in the dashboard.

## 8. Accessibility

- Focus: a visible ring on everything focusable (fields show theirs by line and ring). Every icon
  button has a name. Dialogs trap focus and return it. Status changes are announced. Nothing relies on
  colour alone. Inputs 16px and targets 44px on touch. Text contrast as in section 1.

## What the skill asks that this site does not do

The `design-taste-frontend` skill builds marketing pages from its own system; where it disagrees with
the product owner, the owner's rule stands:

- Scroll reveals, pinned sections, the nav gaining a surface on scroll, motion under reduced-motion
  settings, the three marquees, FAQ answers that slide open and the highlighter (`.pl-hl`) are the
  owner's choices.
- "One section per screen" (every section one or two screens tall) is not the site's rhythm.
- The skill's copy budget (60 to 80 words a screen, a category in every h1) is copy for the owner.
- Sample-data labels in the integration demos stay ("only checkable claims").

## Checking a change

Run the skill's checkers headless against the local server (`npm run dev:mock`), as SKILL.md
section 6 says: `consistency.mjs <url> --widths 1440,1024,820,768,390 --page software`,
`assets/layout/check.mjs --url <url>` and `perf.mjs <url>` (performance only on a production build).
Read each finding against this file: a real defect is fixed; one that asks for something the owner
ruled out is left, with the rule named.
