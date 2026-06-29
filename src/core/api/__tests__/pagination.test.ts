import { describe, it, expect } from 'vitest';
import { parsePagination } from '../pagination';

const q = (s: string) => new URLSearchParams(s);

describe('parsePagination', () => {
  it('defaults to page 1, limit 20', () => {
    expect(parsePagination(q(''))).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination(q('page=3&limit=25'))).toEqual({ page: 3, limit: 25, skip: 50 });
  });

  it('clamps limit to the max (DoS guard)', () => {
    expect(parsePagination(q('limit=100000')).limit).toBe(100);
    expect(parsePagination(q('limit=500'), { maxLimit: 200 }).limit).toBe(200);
  });

  it('rejects garbage / negative / zero values', () => {
    expect(parsePagination(q('page=-5&limit=0'))).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination(q('page=abc&limit=xyz'))).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});
