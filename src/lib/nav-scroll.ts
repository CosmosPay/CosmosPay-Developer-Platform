/* Where the page is under the general nav, on <html>, from the first paint.

   The nav has no surface at the very top of a page and takes its fill, line and blur back once the
   page moves; over a black or paper first panel it is transparent and takes that panel's ink
   (cosmos.css, institutional.css, dashboard.css). Its classes come from React (Nav.tsx), so before
   the nav island hydrated (a slow phone, a busy dev server), or if it never did, the bar stayed
   transparent while the page scrolled under it, content ran through it unblurred, and past a black
   hero it kept the hero's white ink over white sections. This inline script, in the head of both
   layouts, keeps the same two facts without waiting for React, and the styles read either:
   - `data-scrolled`: the page moved more than 8 px (Nav.tsx's `scrolled`);
   - `data-past-panel`: the first `main section[data-panel]` has gone under the bar (Nav.tsx's
     `above`, 72 px being the bar's height). Never set while that section is not parsed yet, so
     the first paint keeps the panel's ink. */
export const NAV_SCROLL_THRESHOLD = 8;
export const NAV_HEIGHT = 72;

export const NAV_SCROLL_SCRIPT =
  `(function(){var d=document.documentElement,set=function(k,v){if(v!==d.hasAttribute(k))d.toggleAttribute(k,v)},` +
  `f=function(){var y=window.scrollY||0,p=document.querySelector("main section[data-panel]");` +
  `set("data-scrolled",y>${NAV_SCROLL_THRESHOLD});set("data-past-panel",!!p&&y>=p.offsetHeight-${NAV_HEIGHT})};` +
  `f();addEventListener("scroll",f,{passive:true});addEventListener("DOMContentLoaded",f);addEventListener("pageshow",f)})();`;
