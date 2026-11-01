// An API reference page renders client-side (<OpenAPIPage>, a client component) from the
// OpenAPI document the server hands it in its props, and React serializes client props into
// the page's RSC payload: inlined in the HTML (`self.__next_f.push`) and written again as the
// page's `index.txt`. `preloadOpenAPIPage()` hands over the whole document, so every API page
// carried every operation and schema of the API (about 620 KB, most of each page's HTML).
//
// This keeps what one page renders: its operations (with the path-level fields they inherit),
// the components they reference, followed transitively, and the security schemes (named by
// `security`, not referenced). Pure, with no imports, so the unit suite can run it.

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

export interface PrunedOperation {
  path: string;
  method: string;
}

export interface PrunedWebhook {
  name: string;
  method: string;
}

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query']);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every local `$ref` (`#/...`) under `node`. */
function collectRefs(node: unknown, into: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, into);
    return;
  }
  if (!isObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      if (value.startsWith('#/')) into.add(value);
    } else {
      collectRefs(value, into);
    }
  }
}

function decodeSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** The part of the document a `$ref` needs: `components/<type>/<name>`, else its top-level key. */
function ownerOf(ref: string): string[] {
  const segments = ref.slice(2).split('/').map(decodeSegment);
  return segments[0] === 'components' ? segments.slice(0, 3) : segments.slice(0, 1);
}

function read(doc: JsonObject, keys: string[]): Json | undefined {
  let node: Json | undefined = doc;
  for (const key of keys) node = isObject(node) ? node[key] : undefined;
  return node;
}

function write(target: JsonObject, keys: string[], value: Json): void {
  let node = target;
  for (const key of keys.slice(0, -1)) {
    const next = node[key];
    node = isObject(next) ? next : (node[key] = {});
  }
  node[keys[keys.length - 1]] = value;
}

/** The path item with only the given methods, keeping its path-level fields (parameters, servers). */
function pickMethods(item: Json | undefined, methods: Set<string>): JsonObject | undefined {
  if (!isObject(item)) return undefined;
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(item)) {
    if (!HTTP_METHODS.has(key) || methods.has(key)) out[key] = value;
  }
  return out;
}

function group<T>(items: T[], key: (item: T) => string, method: (item: T) => string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const item of items) {
    const set = out.get(key(item)) ?? new Set<string>();
    set.add(method(item).toLowerCase());
    out.set(key(item), set);
  }
  return out;
}

/**
 * The document reduced to the given operations and webhooks: the same shape, every `$ref`
 * they reach still resolvable. Top-level fields the reference does not render (the API's
 * long description, tags, external docs) are dropped; `info` keeps its title and version.
 */
export function pruneOpenAPIDocument<T extends object>(
  document: T,
  { operations = [], webhooks = [] }: { operations?: PrunedOperation[]; webhooks?: PrunedWebhook[] },
): T {
  const doc = document as unknown as JsonObject;
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'paths' || key === 'webhooks' || key === 'components' || key === 'tags' || key === 'externalDocs') continue;
    if (key === 'info' && isObject(value)) {
      out.info = { title: value.title ?? '', version: value.version ?? '' };
      continue;
    }
    out[key] = value;
  }

  const paths: JsonObject = {};
  for (const [path, methods] of group(operations, (op) => op.path, (op) => op.method)) {
    const item = pickMethods(read(doc, ['paths', path]), methods);
    if (item) paths[path] = item;
  }
  out.paths = paths;

  if (webhooks.length) {
    const hooks: JsonObject = {};
    for (const [name, methods] of group(webhooks, (hook) => hook.name, (hook) => hook.method)) {
      const item = pickMethods(read(doc, ['webhooks', name]), methods);
      if (item) hooks[name] = item;
    }
    out.webhooks = hooks;
  }

  const components: JsonObject = {};
  const schemes = read(doc, ['components', 'securitySchemes']);
  if (schemes !== undefined) components.securitySchemes = schemes;
  out.components = components;

  // Follow the references from what is kept until nothing new is reached.
  const pending = new Set<string>();
  collectRefs(out, pending);
  const copied = new Set<string>();
  while (pending.size) {
    const [ref] = pending;
    pending.delete(ref);
    const owner = ownerOf(ref);
    const id = owner.join('/');
    if (copied.has(id)) continue;
    copied.add(id);
    const value = read(doc, owner);
    if (value === undefined) continue;
    write(out, owner, value);
    collectRefs(value, pending);
  }

  return out as unknown as T;
}
