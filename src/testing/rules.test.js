import { describe, it, expect } from 'vitest';
import { stepInDirection, stepInDiagonal, isKingAttacked } from '../shared/rules.js';

describe('axial directions', () => {
  it('AXIAL_DIRS: N, NW, SW, S, SE, NE', () => {
    const cellIndex = 18;
    let oneStep = stepInDirection(cellIndex, 0, 1);
    expect(oneStep).toBe(19);
    oneStep = stepInDirection(cellIndex, 1, 1);
    expect(oneStep).toBe(13);
    oneStep = stepInDirection(cellIndex, 2, 1);
    expect(oneStep).toBe(12);
    oneStep = stepInDirection(cellIndex, 3, 1);
    expect(oneStep).toBe(17);
    oneStep = stepInDirection(cellIndex, 4, 1);
    expect(oneStep).toBe(23);
    oneStep = stepInDirection(cellIndex, 5, 1);
    expect(oneStep).toBe(24);
  });
  it('AXIAL_DIAGS: E, NE, NW, W, SW, SE', () => {
    const cellIndex = 18;
    let oneStep = stepInDiagonal(cellIndex, 0, 1);
    expect(oneStep).toBe(30);
    oneStep = stepInDiagonal(cellIndex, 1, 1);
    expect(oneStep).toBe(25);
    oneStep = stepInDiagonal(cellIndex, 2, 1);
    expect(oneStep).toBe(14);
    oneStep = stepInDiagonal(cellIndex, 3, 1);
    expect(oneStep).toBe(6);
    oneStep = stepInDiagonal(cellIndex, 4, 1);
    expect(oneStep).toBe(11);
    oneStep = stepInDiagonal(cellIndex, 5, 1);
    expect(oneStep).toBe(22);
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
