import { describe, it, expect } from 'vitest';
import { GRID, IDX_BY_QR, getIndexOf } from './shared/hexGrid.js';
import { PIECES, SETUP_POOL, isKingAttacked } from './shared/rules.js';


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

describe('AI helper', () => {
  it('check isKingAttacked by charger', () => {
    const cells = Array(37).fill(null);
    const kings = { W: 'WK', B: 'BK' };
    const chargers = { W: 'WC', B: 'BC' };
    const colors = ['W', 'B'];
    const indices = { W: [31, 20, 7], B: [5, 16, 29] };

    for (const color of colors) {
      cells[18] = kings[color];
      const oppColor = color === 'W' ? 'B' : 'W';
      for (const index of indices[color]) {
        cells[index] = chargers[oppColor];
        expect(isKingAttacked(cells, color)).toBe(true);
        cells[index] = null;
      }
      for (const index of indices[oppColor]) {
        cells[index] = chargers[oppColor];
        expect(isKingAttacked(cells, color)).toBe(false);
        cells[index] = null;
      }
    }
  });
});
