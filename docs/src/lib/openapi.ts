import { createOpenAPI } from 'fumadocs-openapi/server';

// The processed spec (tags + servers injected) is written to docs/openapi.json by
// scripts/generate-api.mjs. The `input` key here MUST match the one used there so the
// `document="./openapi.json"` ids baked into generated MDX resolve at render time.
export const openapi = createOpenAPI({
  input: ['./openapi.json'],
});
