import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';
import { hexagonStarAxial } from "./hexGrid.js";
import { PAWN_START, isPawnStart, PAWN_FORWARD_DIR, PAWN_CAPTURE_DIRS, SETUP_POOL_W, SETUP_POOL_B, isBackRank } from "./shared/rules.js";

/**
 * @typedef {'W'|'B'} Color
 * @typedef {{color: Color, glyph: string}} Piece
 * @typedef {(Piece|null)[]} Cells
 * @typedef {{cells: Cells, setupPool?: Record<Color, string[]>, [k: string]: any}} GameState
 * @typedef {{currentPlayer: '0'|'1', phase?: string, [k: string]: any}} Ctx
 */

/**
 * Star-shaped hex grid (axial coordinates) used by this game.
 * Built for radius `R=2`, yielding 37 cells in a hex-star shape.
 * @type {{q:number, r:number}[]}
 */
export const GRID = hexagonStarAxial(2);


/* ****** Helper variables and functions ****** */

/**
 * Current side to move → `'W'` for player 0, `'B'` for player 1.
 * @param {Ctx} ctx
 * @returns {Color}
 */
const colorToMove = (ctx) => (ctx.currentPlayer === '0' ? 'W' : 'B');

/**
 * Fast lookup from axial `"q,r"` to GRID index.
 * Keys are stringified axial coords, values are 0-based indices.
 * @type {Map<string, number>}
 */
export const IDX_BY_QR = new Map(GRID.map((c, i) => [`${c.q},${c.r}`, i]));

/**
 * Convert axial coords to a GRID index (or `null` if off-board).
 * @param {number} q
 * @param {number} r
 * @returns {number|null}
 */
export const getIndexOf = (q, r) => {
  const v = IDX_BY_QR.get(`${q},${r}`);
  return v === undefined ? null : v;
};

/**
 * Six axial orthogonal directions (flat-top hexes).
 * - 0: SW, 1: NW, 2: N, 3: NE, 4: SE, 5: S
 * @type {[number,number][]}
 */
const AXIAL_DIRS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];

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
 * Does the player with `color` have at least one legal move?
 * @param {GameState} G
 * @param {Color} color
 * @returns {boolean}
 */
function playerHasAnyMove(G, color) {
  for (let i = 0; i < G.cells.length; i++) {
    const piece = G.cells[i];
    if (!piece || piece.color !== color) continue;
    if (pieceLegalMoves(G, i).length > 0) return true;
  }
  return false;
}

/**
 * Is the atomic move `{from,to}` legal in the current state/turn?
 * Validates correct side to move and per-piece move rules.
 * @param {GameState} G
 * @param {Ctx} ctx
 * @param {number} from
 * @param {number} to
 * @returns {boolean}
 */
function isLegalPlay(G, ctx, from, to) {
  const piece = G.cells[from];
  if (!piece) return false;
  if (piece.color !== colorToMove(ctx)) return false;
  return pieceLegalMoves(G, from).includes(to);
}

/**
 * Apply a previously validated move to game state.
 * Also handles auto-promotion (to queen) when a pawn reaches the back rank.
 * @param {GameState} G
 * @param {number} from
 * @param {number} to
 * @returns {void}
 */
function applyPlay(G, from, to) {
  const movedPiece = G.cells[from];
  G.cells[to] = movedPiece;
  G.cells[from] = null;

  // check pawn promotion if applicable; auto-queen for now
  if (movedPiece.glyph === PIECES.WP.glyph && isBackRank("B", to)) {
    G.cells[to] = PIECES.WQ;
  } else if (movedPiece.glyph === PIECES.BP.glyph && isBackRank("W", to)) {
    G.cells[to] = PIECES.BQ;
  }
}


/* ****** AI Helper ****** */

/**
 * Generate all legal atomic moves for the given color in this position.
 * @param {GameState} G
 * @param {Color} color
 * @returns {{from:number, to:number}[]}
 */
function generateAllMoves(G, color) {
  const moves = [];
  for (let from = 0; from < G.cells.length; from++) {
    const piece = G.cells[from];
    if (!piece || piece.color !== color) continue;
    const legalMoves = pieceLegalMoves(G, from);
    for (const to of legalMoves) moves.push({ from, to });
  }
  return moves;
}

/**
 * Create a shallow next-position cells array after moving one piece.
 * Used to simulate one move ahead.
 * @param {Cells} cells
 * @param {number} from
 * @param {number} to
 * @returns {Cells}
 */
function nextStateCells(cells, from, to) {
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
function isKingAttacked(cells, kingColor) {
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


/* ****** Piece definitions ****** */

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


/* ****** Move generators ****** */

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
 * Wrapper used by server validation/AI to call the cells-only dispatcher.
 * @param {GameState} G
 * @param {number} index
 * @returns {number[]}
 */
function pieceLegalMoves(G, index) {
  return legalMovesFromCells(G.cells, index);
}

/**
 * Pawn moves:
 * - One step forward if empty
 * - Two steps from starting rank if both squares empty
 * - Diagonal captures
 *
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function pawnMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];

  const forward = PAWN_FORWARD_DIR[piece.color];
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
  for (const direction of PAWN_CAPTURE_DIRS[piece.color]) {
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
 * Rook moves: any number of steps vertically (axial directions 2 and 5).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function rookMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const directions = [2, 5];
  return directions.flatMap(d => slide(cells, index, d));
}

/**
 * Bishop moves: any number of steps along non-vertical orthogonals
 * (axial directions 0,1,3,4).
 * @param {Cells} cells
 * @param {number} index
 * @returns {number[]}
 */
function bishopMoves(cells, index) {
  const piece = cells[index];
  if (!piece) return [];
  const directions = [0, 1, 3, 4];
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


/* ****** Game logic ****** */

/**
 * Boardgame.io game definition for HexChess.
 * Phases:
 *  - `setup`: players alternately place non-pawn pieces on their back ranks.
 *  - `play` : normal play with atomic `play(from,to)` moves.
 *
 * End conditions:
 *  - A king is captured → win for the opponent.
 *  - No legal moves for current player → draw.
 *
 * AI:
 *  - Enumerates legal atomic moves; 
 *  - prunes moves that leave king in check.
 *
 * @type {import('boardgame.io').Game<GameState>}
 */
export const HexChess = {
  name: "hex-chess",

  setup: () => {
    const cells = Array(37).fill(null);

    // Setup the pawns
    PAWN_START["W"].forEach((n) => (cells[n] = PIECES.WP));
    PAWN_START["B"].forEach((n) => (cells[n] = PIECES.BP));

    const setupPool = { W: [...SETUP_POOL_W], B: [...SETUP_POOL_B] };

    return {
      cells,
      phase: "setup",
      setupPool,
    };
  },

  phases: {
    setup: {
      start: true,
      turn: { moveLimit: 1 }, // alternate automatically
      endIf: ({ G }) => !!G.setupPool && G.setupPool.W?.length === 0 && G.setupPool.B?.length === 0,
      next: "play",
      moves: {
        // Setup move: place one non-pawn piece on your back rank
        placePiece: ({ G, ctx }, targetIndex, pieceCode) => {
          const color = colorToMove(ctx);

          // Validate
          if (!isBackRank(color, targetIndex)) return INVALID_MOVE;
          if (G.cells[targetIndex] != null) return INVALID_MOVE;
          if (!G.setupPool[color].includes(pieceCode)) return INVALID_MOVE;
          if (!PIECES[pieceCode] || PIECES[pieceCode].color !== color) return INVALID_MOVE;

          // Place
          G.cells[targetIndex] = PIECES[pieceCode];
          // Remove from pool
          const index = G.setupPool[color].indexOf(pieceCode);
          G.setupPool[color].splice(index, 1);
        },
      },
    },

    play: {
      turn: { moveLimit: 1 }, // alternate automatically
      moves: {
        // Atomic human/AI move
        play: ({ G, ctx }, from, to) => {
          if (!isLegalPlay(G, ctx, from, to)) return INVALID_MOVE;
          applyPlay(G, from, to);
        },
      },
    },
  },

  endIf: ({ G, ctx }) => {
    if (ctx.phase === "setup") return;

    // 1) King captured?
    const whiteKingAlive = G.cells.some(c => c && c.glyph === PIECES.WK.glyph);
    const blackKingAlive = G.cells.some(c => c && c.glyph === PIECES.BK.glyph);

    if (!whiteKingAlive && !blackKingAlive) return { draw: true };
    if (!whiteKingAlive) return { winner: '1' }; // Black wins
    if (!blackKingAlive) return { winner: '0' }; // White wins

    // 2) No legal moves for the side to move? -> draw (kept for future pieces)
    if (!playerHasAnyMove(G, colorToMove(ctx))) return { draw: true };

    return;
  },

  ai: {
    enumerate: (G, ctx) => {
      const color = colorToMove(ctx);
      const allMoves = generateAllMoves(G, color);
      const safeMoves = allMoves.filter(({ from, to }) => {
        const nextCells = nextStateCells(G.cells, from, to);
        return !isKingAttacked(nextCells, color);
      });
      // if none safe, play anything
      const chosenMoves = safeMoves.length ? safeMoves : allMoves;
      // sort by captures first
      chosenMoves.sort((a, b) => (G.cells[b.to] ? 1 : 0) - (G.cells[a.to] ? 1 : 0));
      return chosenMoves.map(({ from, to }) => ({ move: 'aiPlay', args: [from, to] }));
    },
  },
};
