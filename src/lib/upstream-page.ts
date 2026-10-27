/* upstream-page.ts: the rows of a list the Payments API answers. Its lists come as a page
   ({ data, total, take, skip }); older ones came as a bare array. Reading the page itself as the
   list is what left the dashboard's webhooks table empty with endpoints registered. */
export function pageRows<T>(page: T[] | { data?: T[] | null } | null | undefined): T[] {
  if (Array.isArray(page)) return page;
  return page && Array.isArray(page.data) ? page.data : [];
}
