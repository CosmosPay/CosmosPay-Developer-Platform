/* An API key's scopes live in its APISIX credential's `permissions` label, and APISIX caps
   every label value at 256 characters with no whitespace (schema_def.lua, label_value_def).
   The JSON array this label used to hold is 344 characters for the full catalog
   (src/lib/cosmos-scopes.ts, 22 scopes), so APISIX refused every key with 17 scopes or more,
   an "Admin" key included, and the dashboard answered a bare 500 (found 2026-11-18).

   The label is now compact: one entry per resource with the actions it grants,
   `payments:rw,swaps:r,webhooks:w` (121 characters for the whole catalog). A key written
   before keeps its JSON label; the parser reads both. Only this app reads the label: the
   consumer forwarder bakes the parsed scopes into its own plugin config, which has no such
   limit, so the Payments service never sees this format. */

/** APISIX's limit on one label value. */
export const LABEL_MAX = 256;

const SCOPE = /^([a-z0-9_-]+):(read|write)$/;
const ENTRY = /^([a-z0-9_-]+):(r|w|rw)$/;

export class PermissionsLabelTooLongError extends Error {
  readonly length: number;

  constructor(length: number) {
    super(`The scopes do not fit in an APISIX label (${length} > ${LABEL_MAX} characters)`);
    this.name = "PermissionsLabelTooLongError";
    this.length = length;
  }
}

/**
 * The label value for a key's scopes. `resource:read` / `resource:write` pairs are folded per
 * resource, in the order they first appear; a list with any other scope keeps the JSON form.
 * Throws when the value would not fit, so a caller can refuse with a reason instead of APISIX
 * refusing without one.
 */
export function encodePermissionsLabel(permissions: readonly string[]): string {
  const unique = [...new Set(permissions)];
  let value: string;
  if (unique.length === 0) {
    value = "[]";
  } else if (unique.every((scope) => SCOPE.test(scope))) {
    const actions = new Map<string, Set<string>>();
    for (const scope of unique) {
      const [, resource, action] = SCOPE.exec(scope) as RegExpExecArray;
      if (!actions.has(resource)) actions.set(resource, new Set());
      actions.get(resource)!.add(action);
    }
    value = [...actions]
      .map(([resource, set]) => `${resource}:${set.has("read") ? "r" : ""}${set.has("write") ? "w" : ""}`)
      .join(",");
  } else {
    value = JSON.stringify(unique);
  }
  if (value.length > LABEL_MAX) throw new PermissionsLabelTooLongError(value.length);
  return value;
}

/** The scopes a label grants, from either form; anything unreadable grants nothing. */
export function parsePermissionsLabel(raw: unknown): string[] {
  if (typeof raw !== "string" || raw.length === 0) {
    return [];
  }

  if (raw.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }

  const scopes: string[] = [];
  for (const entry of raw.split(",")) {
    const match = ENTRY.exec(entry);
    if (!match) return [];
    const [, resource, flags] = match;
    if (flags.includes("r")) scopes.push(`${resource}:read`);
    if (flags.includes("w")) scopes.push(`${resource}:write`);
  }
  return scopes;
}
