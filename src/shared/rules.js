/**
 * @typedef {'W'|'B'} Color
 * @typedef {{color: Color, glyph: string}} Piece
 * @typedef {(Piece|null)[]} Cells
 * @typedef {'WR'|'WN'|'WB'|'WQ'|'WK'|'BR'|'BN'|'BB'|'BQ'|'BK'} SetupPieceCode
 */

import { GRID, AXIAL_DIRS, getIndexOf } from './hexGrid.js';

/**
 * Piece metadata table.
 * Use values from here (e.g., glyphs) when rendering.
 * @type {Record<'WP'|'BP'|'WK'|'BK'|'WQ'|'BQ'|'WB'|'BB'|'WN'|'BN'|'WR'|'BR', Piece>}
 */
export const PIECES = {
  WP: { color: 'W', glyph: '♙' },
  BP: { color: 'B', glyph: '♟' },
  WK: { color: 'W', glyph: '♔' },
  BK: { color: 'B', glyph: '♚' },
  WQ: { color: 'W', glyph: '♕' },
  BQ: { color: 'B', glyph: '♛' },
  WB: { color: 'W', glyph: '♗' },
  BB: { color: 'B', glyph: '♝' },
  WN: { color: 'W', glyph: '♘' },
  BN: { color: 'B', glyph: '♞' },
  WR: { color: 'W', glyph: '♖' },
  BR: { color: 'B', glyph: '♜' },
};

/**
 * Back-rank cell indices for placement/promotion by color.
 * - White places on {4,11,17,22,28} 
 * - → indices [3,10,16,21,27].
 * - Black places on {10,16,21,27,34} 
 * - → indices [9,15,20,26,33].
 *
 * @type {{W:number[], B:number[]}}
 */
export const BACK_RANK = {
  W: [3, 10, 16, 21, 27],
  B: [9, 15, 20, 26, 33],
};

/**
 * Pawn starting indices by color. Also used for double-step eligibility.
 * - White: {5,12,18,23,29} 
 * - → indices [4,11,17,22,28].
 * - Black: {9,15,20,26,33} 
 * - → indices [8,14,19,25,32].
 *
 * @type {{W:number[], B:number[]}}
 */
export const PAWN_START = {
  W: [4, 11, 17, 22, 28],
  B: [8, 14, 19, 25, 32],
};

/**
 * Setup pool for White and Black (piece codes placed during Setup phase).
 * - When placing one by one, the order is determined by the player
 * - When placing all at once, this fixed order is used
 * - When placing all at random, a random order is used
 *
 * @type {SetupPieceCode[]}
 */
export const SETUP_POOL = Object.freeze({
  W: Object.freeze(['WR', 'WN', 'WB', 'WQ', 'WK']),
  B: Object.freeze(['BR', 'BN', 'BB', 'BQ', 'BK']),
});

/**
 * Predicate: Is cell at `index` on the back rank for `color`?
 *
 * @param {Color} color
 * @param {number} index
 * @returns {boolean}
 */
export const isBackRank = (color, index) => BACK_RANK[color].includes(index);

/**
 * Predicate: Is cell at `index` a pawn starting square for `color`?
 * (Used to allow the initial double-step.)
 *
 * @param {Color} color
 * @param {number} index
 * @returns {boolean}
 */
export const isPawnStart = (color, index) => PAWN_START[color].includes(index);


/* ****** Move Logic ****** */

/**
 * Step from a starting cell by axial direction and number of steps.
 * @param {number} from
 * @param {number} direction 0..5 (see {@link AXIAL_DIRS})
 * @param {number} [steps=1]
 * @returns {number|null} destination index or `null` if you walk off the board.
 */
function stepInDirection(from, direction, steps = 1) {
  const { q, r } = GRID[from];
  const [dq, dr] = AXIAL_DIRS[direction];
  return getIndexOf(q + dq * steps, r + dr * steps);
}

/**
 * Slide/ray moves in a single direction until blocked.
 * Continues through empty squares, includes the first enemy square, then stops.
 * @param {Cells} cells
 * @param {number} from
 * @param {number} direction
 * @returns {number[]} reachable destination indices
 */
function slide(cells, from, direction) {
  const legalMoves = [];
  const myColor = cells[from].color;

  let current = from;
  while (true) {
    const next = stepInDirection(current, direction, 1);
    if (next == null) break;

    const occupied = cells[next];
    if (occupied == null) { // empty: can continue
      legalMoves.push(next);
      current = next;
      continue;
    }
    if (occupied.color !== myColor) { // first enemy: capture and stop
      legalMoves.push(next);
    }
    break; // own piece or enemy — stop the slide / ray
  }
  return legalMoves;
}

/**
 * Dispatcher: legal moves for the piece on `cells[id]`.
 * Provided as a cells-only helper for UI and tests.
 *
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]} destination indices
 */
export function legalMovesFromCells(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const glyph = piece.glyph;

  if (glyph === PIECES.WP.glyph || glyph === PIECES.BP.glyph) return pawnMoves(cells, index);
  if (glyph === PIECES.WK.glyph || glyph === PIECES.BK.glyph) return kingMoves(cells, index);
  if (glyph === PIECES.WN.glyph || glyph === PIECES.BN.glyph) return knightMoves(cells, index);
  if (glyph === PIECES.WR.glyph || glyph === PIECES.BR.glyph) return rookMoves(cells, index);
  if (glyph === PIECES.WB.glyph || glyph === PIECES.BB.glyph) return bishopMoves(cells, index);
  if (glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph) return queenMoves(cells, index);
  return [];
}

/**
 * Pawn moves:
 * - One step forward if empty (white: N(0) | black: S(3))
 * - Two steps from starting rank if both squares empty
 * - Diagonal captures (white: NW(1) and NE(5) | black: SW(2) and SE(4))
 * - axial directions from {@link AXIAL_DIRS} table
 *
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function pawnMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];

  const forward = piece.color === "W" ? 0 : 3;
  const captureDirection = piece.color === "W" ? [1, 5] : [2, 4];
  const oneStep = stepInDirection(index, forward, 1);
  const twoSteps = stepInDirection(index, forward, 2);

  const legalMoves = [];

  // Single step forward (must be empty)
  if (oneStep != null && cells[oneStep] === null) legalMoves.push(oneStep);

  // Double step from starting rank (both squares must be empty)
  const onStart = isPawnStart(piece.color, index);
  if (onStart && oneStep != null && cells[oneStep] === null
    && twoSteps != null && cells[twoSteps] === null) {
    legalMoves.push(twoSteps);
  }

  // Captures
  for (const direction of captureDirection) {
    const target = stepInDirection(index, direction, 1);
    if (target != null) {
      const occupied = cells[target];
      if (occupied && occupied.color !== piece.color) legalMoves.push(target);
    }
  }
  return legalMoves;
}

/**
 * King moves: one step in any orthogonal direction.
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function kingMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const legalMoves = [];
  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const target = stepInDirection(index, dirIdx, 1);
    if (target == null) continue;
    const occupied = cells[target];
    if (occupied == null || occupied.color !== piece.color) legalMoves.push(target);
  }
  return legalMoves;
}

/**
 * Knight jumps over other pieces: two steps in any orthogonal direction, then one step
 * in the adjacent direction (L-jump)
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function knightMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const { q, r } = GRID[index];
  const legalMoves = new Set();

  for (let direction = 0; direction < 6; direction++) {
    const [dq, dr] = AXIAL_DIRS[direction];
    const [lq, lr] = AXIAL_DIRS[(direction + 5) % 6];
    const [rq, rr] = AXIAL_DIRS[(direction + 1) % 6];
    const left = getIndexOf(q + 2 * dq + lq, r + 2 * dr + lr);
    const right = getIndexOf(q + 2 * dq + rq, r + 2 * dr + rr);

    for (const target of [left, right]) {
      if (target != null) {
        const occupied = cells[target];
        if (!occupied || occupied.color !== piece.color) legalMoves.add(target);
      }
    }
  }
  //convert from Set
  return [...legalMoves];
}

/**
 * Rook moves: any number of steps vertically (axial directions 0 and 3).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function rookMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const directions = [0, 3];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Bishop moves: any number of steps along non-vertical orthogonals
 * (axial directions 1,2,4,5).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function bishopMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const directions = [1, 2, 4, 5];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Queen moves: any number of steps in any orthogonal direction.
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function queenMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const directions = [0, 1, 2, 3, 4, 5];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Charger moves: any number of steps vertically (axial directions 1, 0, 5).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function chargerMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const directions = [0, 3];
  return directions.flatMap(d => slide(cells, index, d));
}



/* ****** AI Helper ****** */

/**
 * Create a shallow next-position cells array after moving one piece.
 * Used to simulate one move ahead.
 * @param {Cells} cells
 * @param {number} from
 * @param {number} to
 * @returns {Cells}
 */
export function nextStateCells(cells, from, to) {
  const nextCells = cells.slice();
  nextCells[to] = cells[from];
  nextCells[from] = null;
  return nextCells;
}

/**
 * Locate the king of `color` in the given cells array.
 * @param {Cells} cells
 * @param {Color} color
 * @returns {number} index of the king, or `-1` if not present
 */
function getKingIndex(cells, color) {
  const glyph = color === 'W' ? PIECES.WK.glyph : PIECES.BK.glyph;
  for (let i = 0; i < cells.length; i++) {
    const piece = cells[i];
    if (piece && piece.glyph === glyph) return i;
  }
  return -1; // captured
}

/**
 * Is the king of `kingColor` currently attacked in this position?
 * Checks pawn, knight, sliding (rook/bishop/queen), and adjacent-king attacks.
 * @param {Cells} cells
 * @param {Color} kingColor
 * @returns {boolean}
 */
export function isKingAttacked(cells, kingColor) {
  let kingIndex = getKingIndex(cells, kingColor);
  if (kingIndex < 0) return true;
  const oppColor = kingColor === 'W' ? 'B' : 'W';

  // 1) Pawn attacks (symmetric from king square)
  for (const direction of PAWN_CAPTURE_DIRS[kingColor]) {
    const source = stepInDirection(kingIndex, direction, 1);
    const piece = source != null ? cells[source] : null;
    if (piece && piece.color === oppColor && (piece.glyph === PIECES.WP.glyph || piece.glyph === PIECES.BP.glyph)) {
      return true;
    }
  }
  // 2) Knight attacks (L-jumps are symmetrical)
  for (const source of knightMoves(cells, kingIndex)) {
    const piece = cells[source];
    if (piece && piece.color === oppColor && (piece.glyph === PIECES.WN.glyph || piece.glyph === PIECES.BN.glyph)) {
      return true;
    }
  }
  // 3) Sliding attacks: rook/bishop/queen
  const rookDirs = [2, 5];
  const bishopDirs = [0, 1, 3, 4];

  const isSlideAttacked = (dirs, isAttacker) => {
    for (const direction of dirs) {
      let current = kingIndex;
      while (true) {
        const next = stepInDirection(current, direction, 1);
        if (next == null) break;
        const piece = cells[next];
        if (!piece) { current = next; continue; }
        if (piece.color === oppColor && isAttacker(piece.glyph)) return true;
        break;
      }
    }
    return false;
  };

  if (isSlideAttacked(rookDirs, glyph => glyph === PIECES.WR.glyph || glyph === PIECES.BR.glyph
    || glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph)) {
    return true;
  }
  if (isSlideAttacked(bishopDirs, glyph => glyph === PIECES.WB.glyph || glyph === PIECES.BB.glyph
    || glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph)) {
    return true;
  }

  // 4) Adjacent opposing king
  for (let direction = 0; direction < 6; direction++) {
    const source = stepInDirection(kingIndex, direction, 1);
    const piece = source != null ? cells[source] : null;
    if (piece && piece.color === oppColor && (piece.glyph === PIECES.WK.glyph || piece.glyph === PIECES.BK.glyph)) {
      return true;
    }
  }
  return false;
}
