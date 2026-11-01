import type { APIRoute } from "astro";
import { agentSkillsIndex } from "@/lib/seo/agent-skills";

/* /.well-known/agent-skills/index.json (Agent Skills Discovery, draft v0.2.0) on every domain, the
   same file (src/lib/seo/agent-skills.ts): the public Cosmos Pay agent skill. GET and HEAD, as the
   draft requires, readable from any origin (it names nothing private), cached an hour like the
   other discovery files. src/lib/hosts.ts lets the path through on every domain. */
const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = () => new Response(JSON.stringify(agentSkillsIndex(), null, 2), { headers: HEADERS });
export const HEAD: APIRoute = () => new Response(null, { headers: HEADERS });
