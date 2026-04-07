export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>,
): Response {
  return Response.json(
    { error: { code, message, details } },
    { status },
  );
}

export function notFound(resource = 'Resource'): Response {
  return apiError('NOT_FOUND', `${resource} not found`, 404);
}

export function forbidden(message = 'Insufficient permissions'): Response {
  return apiError('FORBIDDEN', message, 403);
}

export function unauthorized(message = 'Authentication required'): Response {
  return apiError('UNAUTHORIZED', message, 401);
}

export function validationError(
  details: Array<{ field: string; message: string }>,
): Response {
  return apiError('VALIDATION_ERROR', 'Validation failed', 422, details);
}

export function conflict(message: string): Response {
  return apiError('CONFLICT', message, 409);
}
