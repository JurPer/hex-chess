import { describe, it, expect } from 'vitest';
import { GRID, IDX_BY_QR, getIndexOf } from './shared/hexGrid.js';
import { SETUP_POOL } from './shared/rules.js';


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

describe('setup', () => {
  it('changes in setupPool do not affect SETUP_POOL', () => {
    const setupPool = { W: [...SETUP_POOL.W], B: [...SETUP_POOL.B] };
    expect(setupPool["W"].length).toBe(SETUP_POOL["W"].length);
    setupPool.W.splice(1, 1);
    expect(setupPool["W"].length).toBe(SETUP_POOL["W"].length - 1);
    setupPool["W"][0] = "CORRUPTED";
    expect(setupPool["W"][0]).not.toBe(SETUP_POOL["W"][0]);
  });
});
