import { describe, it, expect } from 'vitest';
import { GRID, IDX_BY_QR, getIndexOf } from './Game';

describe('hex index maps', () => {
  it('has 1:1 mapping of coords to indices', () => {
    expect(IDX_BY_QR.size).toBe(GRID.length);
    GRID.forEach(({ q, r }, i) => {
      expect(getIndexOf(q, r)).toBe(i);
    });
  });

  it('returns null for off-board lookups', () => {
    const { q, r } = GRID[0];
    expect(getIndexOf(q + 999, r)).toBeNull();
    expect(getIndexOf(q, r - 999)).toBeNull();
  });

  it('has unique (q,r) keys', () => {
    const keys = GRID.map(({ q, r }) => `${q},${r}`);
    expect(new Set(keys).size).toBe(GRID.length);
  });
});