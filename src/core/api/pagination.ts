export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parses + clamps list pagination params so unbounded/garbage values can't trigger a
 * full-table scan or huge response (a cheap DoS vector). Use in every list route.
 */
export function parsePagination(
  query: URLSearchParams,
  opts?: { defaultLimit?: number; maxLimit?: number },
): PageParams {
  const defaultLimit = opts?.defaultLimit ?? 20;
  const maxLimit = opts?.maxLimit ?? 100;

  let page = parseInt(query.get('page') ?? '1', 10);
  let limit = parseInt(query.get('limit') ?? String(defaultLimit), 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit };
}
