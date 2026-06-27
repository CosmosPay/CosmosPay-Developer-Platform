import {
  ApiStatus,
  type ApiEnvelope,
  type ApiErrorEnvelope,
  type JsonResponseOptions,
} from '@/lib/http/envelope.types';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
} as const;

function toJsonResponse(
  body: ApiEnvelope | ApiErrorEnvelope,
  httpStatus: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders,
    },
  });
}

function buildJsonResponse<T>(
  options: JsonResponseOptions<T>,
  defaults: {
    code: number;
    status: ApiStatus;
    message: string;
  },
): Response {
  const code = options.code ?? defaults.code;
  const status = options.status ?? defaults.status;
  const message = options.message ?? defaults.message;

  return toJsonResponse(
    { data: options.data, code, status, message },
    code,
    options.headers,
  );
}

export function jsonSuccess<T>(options: JsonResponseOptions<T>): Response {
  return buildJsonResponse(options, {
    code: 200,
    status: ApiStatus.SUCCESS,
    message: 'Request completed successfully',
  });
}

export function jsonCreated<T>(options: JsonResponseOptions<T>): Response {
  return buildJsonResponse(options, {
    code: 201,
    status: ApiStatus.CREATED,
    message: 'Resource created successfully',
  });
}

export function jsonError(options: {
  code?: number;
  status?: ApiStatus;
  message: string;
  headers?: Record<string, string>;
}): Response {
  const code = options.code ?? 400;
  const status = options.status ?? ApiStatus.BAD_REQUEST;

  return toJsonResponse(
    {
      data: null,
      code,
      status,
      message: options.message,
    },
    code,
    options.headers,
  );
}

export function jsonBadRequest(
  message = 'Invalid request',
  headers?: Record<string, string>,
): Response {
  return jsonError({
    code: 400,
    status: ApiStatus.BAD_REQUEST,
    message,
    headers,
  });
}

export function jsonUnauthorized(
  message = 'Unauthorized',
  headers?: Record<string, string>,
): Response {
  return jsonError({
    code: 401,
    status: ApiStatus.UNAUTHORIZED,
    message,
    headers,
  });
}

export function jsonForbidden(
  message = 'Forbidden',
  headers?: Record<string, string>,
): Response {
  return jsonError({
    code: 403,
    status: ApiStatus.FORBIDDEN,
    message,
    headers,
  });
}

export function jsonNotFound(
  message = 'Resource not found',
  headers?: Record<string, string>,
): Response {
  return jsonError({
    code: 404,
    status: ApiStatus.NOT_FOUND,
    message,
    headers,
  });
}

export function jsonConflict(
  message = 'Conflict',
  headers?: Record<string, string>,
): Response {
  return jsonError({
    code: 409,
    status: ApiStatus.CONFLICT,
    message,
    headers,
  });
}

export function jsonInternalError(
  message = 'Internal server error',
  headers?: Record<string, string>,
): Response {
  return jsonError({
    code: 500,
    status: ApiStatus.INTERNAL_ERROR,
    message,
    headers,
  });
}
