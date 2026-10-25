/* bb.js's browser bundle for the ZK payment pages, with the cross-origin isolation headers its
   Web Worker needs (src/lib/zk/bb-assets.ts says why it is a route and not a static file).
   Reached through the middleware's rewrite to the payments mount, where Astro leaves `params`
   empty for a path with a file extension, so the version and the file come from the path itself
   (`/zk/bb/{version}/{file}`) when they are missing. */
import { bbAssetResponse } from "@/lib/zk/bb-assets";
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ params, url }) => {
  const [file, version] = url.pathname.split("/").filter(Boolean).reverse();
  return bbAssetResponse(params.version ?? version, params.file ?? file);
};
