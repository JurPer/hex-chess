/**
 * @typedef {'W'|'B'} Color
 * @typedef {{color: Color, glyph: string}} Piece
 * @typedef {(string|null)[]} Cells
 * @typedef {'WR'|'WN'|'WB'|'WQ'|'WK'|'WC'|'BR'|'BN'|'BB'|'BQ'|'BK'|'BC'} PieceCode
 */

import { GRID, AXIAL_DIRS, getIndexOf } from './hexGrid.js';

/**
 * Piece metadata table.
 * Use values from here (e.g., glyphs) when rendering.
 * @type {Record<'WP'|'BP'|'WK'|'BK'|'WQ'|'BQ'|'WB'|'BB'|'WN'|'BN'|'WR'|'BR', Piece>}
 */
const PIECES = {
  WP: { color: 'W', glyph: '♙', kind: 'pawn' },
  BP: { color: 'B', glyph: '♟', kind: 'pawn' },
  WK: { color: 'W', glyph: '♔', kind: 'king' },
  BK: { color: 'B', glyph: '♚', kind: 'king' },
  WN: { color: 'W', glyph: '♘', kind: 'knight' },
  BN: { color: 'B', glyph: '♞', kind: 'knight' },
  WR: { color: 'W', glyph: '♖', kind: 'rook' },
  BR: { color: 'B', glyph: '♜', kind: 'rook' },
  WB: { color: 'W', glyph: '♗', kind: 'bishop' },
  BB: { color: 'B', glyph: '♝', kind: 'bishop' },
  WQ: { color: 'W', glyph: '♕', kind: 'queen' },
  BQ: { color: 'B', glyph: '♛', kind: 'queen' },
  WC: { color: 'W', glyph: '♤', kind: 'charger' },
  BC: { color: 'B', glyph: '♠', kind: 'charger' },
  WD: { color: 'W', glyph: '🐲', kind: 'dragon' },
  BD: { color: 'B', glyph: '🐲', kind: 'dragon' },
  WG: { color: 'W', glyph: '♡', kind: 'guardian' },
  BG: { color: 'B', glyph: '♥', kind: 'guardian' },
  WF: { color: 'W', glyph: '♧', kind: 'fool' },
  BF: { color: 'B', glyph: '♣', kind: 'fool' },
  WM: { color: 'W', glyph: '🌖', kind: 'moon' },
  BM: { color: 'B', glyph: '🌒', kind: 'moon' },
};

/**
 * Returns the color of the piece with the specified `code`
 *
 * @param {string} code 
 * @returns {string|null} 'W' | 'B' | null
 */
export const colorOf = (code) => (PIECES[code] ? PIECES[code].color : null);

/**
 * Returns the glyph of the piece with the specified `code`
 *
 * @param {string} code 
 * @returns {string|null} '♙' | '♘' | ... | null
 */
export const glyphOf = (code) => (PIECES[code] ? PIECES[code].glyph : null);

/**
 * Returns the kind of the piece with the specified `code`
 * 
 * @param {string} code 
 * @returns {string|null} 'pawn' | 'king' | ... | null
 */
export const kindOf = (code) => (PIECES[code] ? PIECES[code].kind : null);

/**
 * Checks if the pieces with codes `a` and `b` are enemies
 * 
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
export const isEnemy = (a, b) => a && b && PIECES[a].color !== PIECES[b].color;

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
 * Pawn capture directions (axial) by color for flat-top hexes.
 * Direction indices reference your {@link AXIAL_DIRS} table:
 * - 0: N | 1: NW | 2: SW | 3: S | 4: SE | 5: NE
 * 
 * White captures NW(1) and NE(5); Black captures SW(2) and SE(4).
 *
 * @type {{W:number[], B:number[]}}
 */
const PAWN_CAPTURE_DIRS = { W: [1, 5], B: [2, 4] };

/**
 * Setup pool for White and Black (piece codes placed during Setup phase).
 * - When placing one by one, the order is determined by the player
 * - When placing all at once, this fixed order is used
 * - When placing all at random, a random order is used
 *
 * @type {PieceCode[]}
 */
export const SETUP_POOL = Object.freeze({
  W: Object.freeze(['WK', 'WN', 'WB', 'WQ', 'WR', 'WC', 'WD', 'WG']),
  B: Object.freeze(['BK', 'BN', 'BB', 'BQ', 'BR', 'BC', 'BD', 'BG']),
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
const isPawnStart = (color, index) => PAWN_START[color].includes(index);


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
  const pieceCode = cells[from];

  let current = from;
  while (true) {
    const next = stepInDirection(current, direction, 1);
    if (next === null) break;

    const targetCode = cells[next];
    if (targetCode === null) { // empty: can continue
      legalMoves.push(next);
      current = next;
      continue;
    }
    if (isEnemy(pieceCode, targetCode)) { // first enemy: capture and stop
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
  const pieceCode = cells[index];
  if (!pieceCode) return [];

  switch (kindOf(pieceCode)) {
    case 'pawn': return pawnMoves(cells, index);
    case 'king': return kingMoves(cells, index);
    case 'knight': return knightMoves(cells, index);
    case 'rook': return rookMoves(cells, index);
    case 'bishop': return bishopMoves(cells, index);
    case 'queen': return queenMoves(cells, index);
    case 'charger': return chargerMoves(cells, index);
    case 'dragon': return dragonMoves(cells, index);
    case 'guardian': return guardianMoves(cells, index);
  }

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
  const pieceCode = cells[index];
  if (!pieceCode) return [];

  const myColor = colorOf(pieceCode);

  const forward = myColor === "W" ? 0 : 3;
  const captureDirection = PAWN_CAPTURE_DIRS[myColor];
  const oneStep = stepInDirection(index, forward, 1);
  const twoSteps = stepInDirection(index, forward, 2);

  const legalMoves = [];

  // Single step forward (must be empty)
  if (oneStep != null && cells[oneStep] === null) legalMoves.push(oneStep);

  // Double step from starting rank (both squares must be empty)
  const onStart = isPawnStart(myColor, index);
  if (onStart && oneStep != null && cells[oneStep] === null
    && twoSteps != null && cells[twoSteps] === null) {
    legalMoves.push(twoSteps);
  }

  // Captures
  for (const direction of captureDirection) {
    const target = stepInDirection(index, direction, 1);
    if (target != null) {
      const targetCode = cells[target];
      if (targetCode && isEnemy(pieceCode, targetCode)) legalMoves.push(target);
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
  const pieceCode = cells[index];
  if (!pieceCode) return [];
  const legalMoves = [];
  for (let direction = 0; direction < 6; direction++) {
    const target = stepInDirection(index, direction, 1);
    if (target === null) continue;
    const targetCode = cells[target];
    if (targetCode === null || isEnemy(pieceCode, targetCode)) legalMoves.push(target);
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
  const pieceCode = cells[index];
  if (!pieceCode) return [];
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
        const targetCode = cells[target];
        if (!targetCode || isEnemy(pieceCode, targetCode)) legalMoves.add(target);
      }
    }
  }
  //convert from Set
  return [...legalMoves];
}

/**
 * Rook moves: any number of steps vertically (axial directions 0, 3).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function rookMoves(cells, index) {
  const pieceCode = cells[index];
  if (!pieceCode) return [];
  const directions = [0, 3];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Bishop moves: any number of steps along non-vertical orthogonals
 * (axial directions 1, 2, 4, 5).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function bishopMoves(cells, index) {
  const pieceCode = cells[index];
  if (!pieceCode) return [];
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
  const pieceCode = cells[index];
  if (!pieceCode) return [];
  const directions = [0, 1, 2, 3, 4, 5];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Charger moves: any number of steps in the three forward directions 
 * - White: 1, 0, 5.
 * - Black: 2, 3, 4.
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function chargerMoves(cells, index) {
  const pieceCode = cells[index];
  if (!pieceCode) return [];
  const directions = colorOf(pieceCode) === "W" ? [1, 0, 5] : [2, 3, 4];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Dragon moves: one or two steps in any orthogonal direction; 
 * when moving two steps to capture an enemy piece, ANY intermediate piece is also captured.
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function dragonMoves(cells, index) {
  const pieceCode = cells[index];
  const stepCount = 2;
  if (!pieceCode) return [];
  const legalMoves = [];
  for (let direction = 0; direction < 6; direction++) {
    for (let i = 1; i <= stepCount; i++) {
      const step = stepInDirection(index, direction, i);
      if (step === null) continue;
      let targetCode = cells[step];
      if (targetCode === null || isEnemy(pieceCode, targetCode)) legalMoves.push(step);
    }
  }
  return legalMoves;
}

/**
 * Checks if the dragon moved two steps and returns the index of the intermediate cell.
 * @param {number} from 
 * @param {number} to 
 * @returns {number|null} 
 */
export function dragonCollateral(from, to) {
  for (let direction = 0; direction < 6; direction++) {
    const twoSteps = stepInDirection(from, direction, 2);
    if (twoSteps !== to) continue;
    return stepInDirection(from, direction, 1);
  }
  return null;
}

/**
 * Guardian moves: one step in any orthogonal direction. Can swap places with a friendly piece.
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function guardianMoves(cells, index) {
  const pieceCode = cells[index];
  if (!pieceCode) return [];
  const legalMoves = [];
  for (let direction = 0; direction < 6; direction++) {
    const target = stepInDirection(index, direction, 1);
    if (target === null) continue;
    legalMoves.push(target);
  }
  return legalMoves;
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
  const movedPieceCode = cells[from];
  const targetCode = cells[to];

  // check special case for dragon moves
  if (kindOf(movedPieceCode) === 'dragon' && targetCode) {
    const collateralIndex = dragonCollateral(from, to);
    if (collateralIndex) nextCells[collateralIndex] = null;
  }

  nextCells[to] = cells[from];
  nextCells[from] = null;

  // check special case for guardian moves
  if (kindOf(movedPieceCode) === 'guardian' &&
    targetCode && !isEnemy(movedPieceCode, targetCode)) {
    nextCells[from] = targetCode;
  }

  return nextCells;
}

/**
 * Locate the king of `color` in the given cells array.
 * @param {Cells} cells
 * @param {Color} color
 * @returns {number} index of the king, or `-1` if not present
 */
function getKingIndex(cells, color) {
  const kingCode = color === 'W' ? 'WK' : 'BK';
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === kingCode) return i;
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
  const kingCode = cells[kingIndex];

  // 1) Pawn attacks (symmetric from king square)
  for (const direction of PAWN_CAPTURE_DIRS[kingColor]) {
    const source = stepInDirection(kingIndex, direction, 1);
    const pieceCode = source != null ? cells[source] : null;
    if (pieceCode && isEnemy(kingCode, pieceCode) && (kindOf(pieceCode) === 'pawn')) {
      return true;
    }
  }
  // 2) Knight attacks (L-jumps are symmetrical)
  for (const source of knightMoves(cells, kingIndex)) {
    const pieceCode = cells[source];
    if (pieceCode && isEnemy(kingCode, pieceCode) && (kindOf(pieceCode) === 'knight')) {
      return true;
    }
  }
  // 3) Sliding attacks: rook/bishop/queen/charger
  const isSlideAttacked = (dirs, kinds) => {
    for (const direction of dirs) {
      let current = kingIndex;
      while (true) {
        const next = stepInDirection(current, direction, 1);
        if (next == null) break;
        const pieceCode = cells[next];
        if (pieceCode === null) { current = next; continue; }
        if (isEnemy(kingCode, pieceCode) && kinds.includes(kindOf(pieceCode))) return true;
        break;
      }
    }
    return false;
  };

  if (isSlideAttacked([2, 5], ['rook', 'queen'])) {
    return true;
  }
  if (isSlideAttacked([0, 1, 3, 4], ['bishop', 'queen'])) {
    return true;
  }
  const chargerDirs = { W: [1, 0, 5], B: [2, 3, 4] };
  if (isSlideAttacked(chargerDirs[kingColor], ['charger'])) {
    return true;
  }

  // 4) King, Dragon or Guardian attacks
  const kinds = ['king', 'dragon', 'guardian'];
  for (let direction = 0; direction < 6; direction++) {
    const oneStep = stepInDirection(kingIndex, direction, 1);
    if (oneStep === null) continue;
    const oneStepCode = cells[oneStep];
    if (oneStepCode && isEnemy(kingCode, oneStepCode) && kinds.includes(kindOf(oneStepCode))) {
      return true;
    }
    const twoSteps = stepInDirection(kingIndex, direction, 2);
    if (twoSteps === null) continue;
    const twoStepCode = cells[twoSteps];
    if (twoStepCode && isEnemy(kingCode, twoStepCode) && kindOf(twoStepCode) === 'dragon') {
      return true;
    }
  }

  return false;
}
