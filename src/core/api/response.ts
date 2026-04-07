import type { PaginatedResponse } from '@/src/shared/types/api';

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): Response {
  const response: PaginatedResponse<T> = {
    data,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  };
  return Response.json(response);
}

export function created(data: unknown): Response {
  return Response.json(data, { status: 201 });
}

export function ok(data: unknown): Response {
  return Response.json(data);
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
