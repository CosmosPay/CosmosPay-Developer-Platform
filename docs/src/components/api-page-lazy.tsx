'use client';
import dynamic from 'next/dynamic';

/**
 * <OpenAPIPage> as its own chunk. Every docs page is one catch-all route, and a Client Component
 * that a Server Component imports directly joins that route's bundle, so the API reference UI
 * (fumadocs-openapi, its playground and highlighter) was downloaded and parsed by pages that
 * render no API at all. Next.js code-splits `next/dynamic` only from a Client Component, hence
 * this wrapper. It still renders on the server, so the reference stays in the exported HTML.
 */
export const LazyOpenAPIPage = dynamic(() => import('@/components/api-page').then((m) => m.OpenAPIPage));
