import fs from 'node:fs';
import path from 'node:path';

// The API reference pages are generated per OpenAPI tag (scripts/generate-api.mjs) and render
// the spec client-side through <OpenAPIPage>, so their MDX body is only a generated comment.
// That left every LLM output (llms-full.txt, the per-page content.md) without the API reference.
// This renders a tag's operations as plain Markdown from the same docs/openapi.json instead:
// method and path, summary, description, parameters, the request body's top-level fields and
// the responses. The full contract stays one request away at /docs/openapi.json.

interface SchemaObject {
  $ref?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  nullable?: boolean;
}

interface ParameterObject {
  $ref?: string;
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: SchemaObject;
}

interface ResponseObject {
  $ref?: string;
  description?: string;
  content?: Record<string, { schema?: SchemaObject }>;
}

interface OperationObject {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: ParameterObject[];
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, { schema?: SchemaObject }>;
  };
  responses?: Record<string, ResponseObject>;
  security?: unknown[];
}

interface OpenAPIDocument {
  servers?: { url: string; description?: string }[];
  paths: Record<string, Record<string, OperationObject>>;
  tags?: { name: string; description?: string }[];
  components?: {
    schemas?: Record<string, SchemaObject>;
    responses?: Record<string, ResponseObject>;
  };
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const PARAMETER_GROUPS: [string, string][] = [
  ['path', 'Path parameters'],
  ['query', 'Query parameters'],
  ['header', 'Headers'],
];

let cached: OpenAPIDocument | undefined;

/** docs/openapi.json, the spec the API reference renders (`next build` runs in docs/, as
 *  `createOpenAPI({ input: ['./openapi.json'] })` in lib/openapi.ts assumes too). */
export function readOpenAPIDocument(): OpenAPIDocument {
  cached ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), 'openapi.json'), 'utf8')) as OpenAPIDocument;
  return cached;
}

function refName(ref: string): string {
  return ref.slice(ref.lastIndexOf('/') + 1);
}

function resolveSchema(doc: OpenAPIDocument, schema: SchemaObject | undefined): SchemaObject | undefined {
  if (!schema?.$ref) return schema;
  return doc.components?.schemas?.[refName(schema.$ref)];
}

/** A short type label: a referenced schema's name, `X[]` for arrays, the union of variants. */
function typeLabel(schema: SchemaObject | undefined): string {
  if (!schema) return 'unknown';
  if (schema.$ref) return refName(schema.$ref);
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants?.length) return variants.map(typeLabel).join(' | ');
  if (schema.allOf?.length === 1) return typeLabel(schema.allOf[0]);
  if (schema.type === 'array') return `${typeLabel(schema.items)}[]`;
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'object';
  return schema.format ? `${type} (${schema.format})` : type;
}

/** One line of prose: OpenAPI descriptions may span paragraphs, which would break a list item. */
function inline(text: string | undefined): string {
  return (text ?? '').replace(/\s*\n\s*/g, ' ').trim();
}

function fieldLine(name: string, schema: SchemaObject | undefined, required: boolean, description?: string): string {
  const meta = [typeLabel(schema), required ? 'required' : 'optional'].join(', ');
  const values = schema?.enum?.length ? ` One of: ${schema.enum.map((v) => `\`${String(v)}\``).join(', ')}.` : '';
  const text = inline(description ?? schema?.description);
  return `- \`${name}\` (${meta})${text || values ? `: ${text}${values}` : ''}`;
}

/** The top-level fields of a body schema, merging `allOf` parts. */
function bodyFields(doc: OpenAPIDocument, schema: SchemaObject | undefined): string[] {
  const resolved = resolveSchema(doc, schema);
  if (!resolved) return [];
  const parts = resolved.allOf?.length ? resolved.allOf.map((part) => resolveSchema(doc, part)) : [resolved];
  const lines: string[] = [];
  for (const part of parts) {
    const required = new Set(part?.required ?? []);
    for (const [name, prop] of Object.entries(part?.properties ?? {})) {
      lines.push(fieldLine(name, prop, required.has(name)));
    }
  }
  return lines;
}

function responseLine(status: string, response: ResponseObject): string {
  const schema = response.content?.['application/json']?.schema;
  const body = schema ? ` (\`${typeLabel(schema)}\`)` : '';
  const text = inline(response.description);
  return `- ${status}${body}${text ? `: ${text}` : ''}`;
}

/** `shared` collects the shared responses (components/responses: the same errors on most
 *  operations) the operation refers to, listed once per page instead of once per operation. */
function renderOperation(
  doc: OpenAPIDocument,
  method: string,
  route: string,
  op: OperationObject,
  shared: Set<string>,
): string {
  const out: string[] = [];
  out.push(`## ${inline(op.summary) || `${method.toUpperCase()} ${route}`}`, '');
  out.push(`\`${method.toUpperCase()} ${route}\``, '');
  if (op.deprecated) out.push('Deprecated.', '');
  if (op.description?.trim()) out.push(op.description.trim(), '');
  if (Array.isArray(op.security) && op.security.length === 0) out.push('No authentication.', '');

  const params = (op.parameters ?? []).filter((p) => !p.$ref);
  for (const [location, heading] of PARAMETER_GROUPS) {
    const group = params.filter((p) => p.in === location);
    if (!group.length) continue;
    out.push(`**${heading}**`, '');
    for (const p of group) out.push(fieldLine(p.name, p.schema, Boolean(p.required), p.description));
    out.push('');
  }

  for (const [contentType, media] of Object.entries(op.requestBody?.content ?? {})) {
    const required = op.requestBody?.required ? ', required' : '';
    out.push(`**Request body** (\`${contentType}\`${required}): \`${typeLabel(media.schema)}\``, '');
    if (op.requestBody?.description?.trim()) out.push(inline(op.requestBody.description), '');
    const fields = bodyFields(doc, media.schema);
    if (fields.length) out.push(...fields, '');
  }

  const responses = Object.entries(op.responses ?? {});
  if (responses.length) {
    out.push('**Responses**', '');
    for (const [status, response] of responses) {
      const name = response.$ref ? refName(response.$ref) : undefined;
      if (name && doc.components?.responses?.[name]) {
        shared.add(name);
        out.push(`- \`${status}\`: ${name} (see Shared responses)`);
      } else {
        out.push(responseLine(`\`${status}\``, response));
      }
    }
    out.push('');
  }
  return out.join('\n');
}

/**
 * The Markdown of one API reference page: every operation of the tag the page was generated
 * for (`per: 'tag'`, so the page slug is the tag, lowercased), in the spec's order.
 */
export function renderOpenAPITagMarkdown(tagSlug: string): string {
  const doc = readOpenAPIDocument();
  const matches = (tags: string[] | undefined) => (tags ?? []).some((t) => t.toLowerCase() === tagSlug.toLowerCase());
  const out: string[] = [];
  const server = doc.servers?.[0]?.url;
  if (server) out.push(`Base URL: \`${server}\``, '');
  const shared = new Set<string>();
  for (const [route, item] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (op && matches(op.tags)) out.push(renderOperation(doc, method, route, op, shared));
    }
  }
  if (shared.size) {
    out.push('## Shared responses', '');
    for (const name of shared) {
      const response = doc.components?.responses?.[name];
      if (response) out.push(responseLine(`**${name}**`, response));
    }
  }
  return out.join('\n').trim();
}
