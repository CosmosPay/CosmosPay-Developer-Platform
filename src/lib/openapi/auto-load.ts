let routesLoaded = false;

/**
 * Auto-discovers and executes every `openapi.ts` file under `src/schemas/`.
 * Add `src/schemas/<module>/openapi.ts` next to your Zod schemas — no manual registry needed.
 */
export function loadOpenApiRoutes(): void {
  if (routesLoaded) {
    return;
  }

  routesLoaded = true;

  import.meta.glob('/src/schemas/**/openapi.ts', { eager: true });
}
