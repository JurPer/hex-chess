import { describe, it, expect } from 'vitest';
import { GRID, IDX_BY_QR, idxOf } from './Game';

describe('hex index maps', () => {
  it('has 1:1 mapping of coords to indices', () => {
    expect(IDX_BY_QR.size).toBe(GRID.length);
    GRID.forEach(({ q, r }, i) => {
      expect(idxOf(q, r)).toBe(i);
    });
  });

  it('returns null for off-board lookups', () => {
    const { q, r } = GRID[0];
    expect(idxOf(q + 999, r)).toBeNull();
    expect(idxOf(q, r - 999)).toBeNull();
  });

  it('has unique (q,r) keys', () => {
    const keys = GRID.map(({ q, r }) => `${q},${r}`);
    expect(new Set(keys).size).toBe(GRID.length);
  });
});