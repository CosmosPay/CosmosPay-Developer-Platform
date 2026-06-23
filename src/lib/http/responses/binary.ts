import type { FileResponseOptions } from '../envelope.types';

export function fileDownload(options: FileResponseOptions): Response {
  const disposition = options.disposition ?? 'attachment';
  const code = options.code ?? 200;

  return new Response(options.body, {
    status: code,
    headers: {
      'Content-Type': options.mimeType,
      'Content-Disposition': `${disposition}; filename="${options.filename}"`,
      'Cache-Control': 'no-store',
      ...options.headers,
    },
  });
}

export function imageInline(
  options: Omit<FileResponseOptions, 'disposition'>,
): Response {
  return fileDownload({
    ...options,
    disposition: 'inline',
  });
}
