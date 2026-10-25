/* dom.ts — small browser helpers shared by the two elements. */

/** The browser's languages, most preferred first. */
export function browserLanguages(): readonly string[] {
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/** createElement with a class, appended to `parent` when given. Text goes in as textContent. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  parent?: Node,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  parent?.appendChild(node);
  return node;
}
