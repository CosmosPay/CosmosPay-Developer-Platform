export const ApiStatus = {
  SUCCESS: 'success',
  CREATED: 'created',
  NO_CONTENT: 'no_content',
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  UNPROCESSABLE: 'unprocessable',
  INTERNAL_ERROR: 'internal_error',
} as const;

export type ApiStatus = (typeof ApiStatus)[keyof typeof ApiStatus];

export interface ApiEnvelope<T = unknown> {
  data: T;
  code: number;
  status: ApiStatus;
  message: string;
}

export interface ApiErrorEnvelope {
  data: null;
  code: number;
  status: ApiStatus;
  message: string;
}

export interface JsonResponseOptions<T> {
  data: T;
  code?: number;
  status?: ApiStatus;
  message?: string;
  headers?: Record<string, string>;
}

export interface FileResponseOptions {
  body: BodyInit;
  filename: string;
  mimeType: string;
  disposition?: 'inline' | 'attachment';
  code?: number;
  headers?: Record<string, string>;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };
