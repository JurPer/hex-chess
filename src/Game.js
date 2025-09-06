import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';
import { hexagonStarAxial } from "./hexGrid.js";

// Board Grid
export const GRID = hexagonStarAxial(2);

/* ****** Helper variables and functions ****** */
const colorToMove = (ctx) => (ctx.currentPlayer === '0' ? 'W' : 'B');

// Build a quick index -> (q,r) and (q,r) -> index map from your GRID
export const IDX_BY_QR = new Map(GRID.map((c, i) => [`${c.q},${c.r}`, i]));
export const idxOf = (q, r) => {
  const v = IDX_BY_QR.get(`${q},${r}`);
  return v === undefined ? null : v;
};
// 6 axial orthogonal directions 
const AXIAL_DIRS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];
// makes steps from cell with id in one axial direction and returns id of target cell
function stepIdxByDir(fromIdx, dirIdx, steps = 1) {
  const { q, r } = GRID[fromIdx];
  const [dq, dr] = AXIAL_DIRS[dirIdx];
  return idxOf(q + dq * steps, r + dr * steps);
}
// slide / ray along one orthogonal direction until blocked; returns list of indices
function slide(cells, fromIdx, dirIdx) {
  const legalMoves = [];
  const myColor = cells[fromIdx].color;

  let current = fromIdx;
  while (true) {
    const next = stepIdxByDir(current, dirIdx, 1);
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
// Does player with color have any legal move at all?
function playerHasAnyMove(G, color) {
  for (let i = 0; i < G.cells.length; i++) {
    const piece = G.cells[i];
    if (!piece || piece.color !== color) continue;
    if (pieceLegalMoves(G, i).length > 0) return true;
  }
  return false;
}
// Is this atomic move legal right now?
function isLegalPlay(G, ctx, from, to) {
  const piece = G.cells[from];
  if (!piece) return false;
  if (piece.color !== colorToMove(ctx)) return false;
  return pieceLegalMoves(G, from).includes(to);
}
// Apply a (validated) move to state
function applyPlay(G, from, to) {
  const movedPiece = G.cells[from];
  G.cells[to] = movedPiece;
  G.cells[from] = null;

  // check pawn promotion if applicable; auto-queen for now
  if (movedPiece.glyph === PIECES.WP.glyph && BLACK_BACK_RANK.has(to)) {
    G.cells[to] = PIECES.WQ;
  } else if (movedPiece.glyph === PIECES.BP.glyph && WHITE_BACK_RANK.has(to)) {
    G.cells[to] = PIECES.BQ;
  }
}

/* ****** AI Helper ****** */
// All legal moves for a given color -> [{from, to}]
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
// Produce the next-state cells for a moved piece
function nextStateCells(cells, from, to) {
  const nextCells = cells.slice();
  nextCells[to] = cells[from];
  nextCells[from] = null;
  return nextCells;
}
// return index of king for color
function kingIndex(cells, color) {
  const glyph = color === 'W' ? PIECES.WK.glyph : PIECES.BK.glyph;
  for (let i = 0; i < cells.length; i++) {
    const piece = cells[i];
    if (piece && piece.glyph === glyph) return i;
  }
  return -1; // captured
}
// Is the king of color attacked in this cells array?
function isKingAttacked(cells, kingColor) {
  let kingId = kingIndex(cells, kingColor);
  if (kingId < 0) return true;
  const oppColor = kingColor === 'W' ? 'B' : 'W';

  // 1) Pawn attacks (symmetric from king square)
  for (const direction of PAWN_CAPTURE_DIRS[kingColor]) {
    const source = stepIdxByDir(kingId, direction, 1);
    const piece = source != null ? cells[source] : null;
    if (piece && piece.color === oppColor && (piece.glyph === PIECES.WP.glyph || piece.glyph === PIECES.BP.glyph)) {
      return true;
    }
  }
  // 2) Knight attacks (L-jumps are symmetrical)
  for (const source of knightMoves(cells, kingId)) {
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
      let current = kingId;
      while (true) {
        const next = stepIdxByDir(current, direction, 1);
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
    const source = stepIdxByDir(kingId, direction, 1);
    const piece = source != null ? cells[source] : null;
    if (piece && piece.color === oppColor && (piece.glyph === PIECES.WK.glyph || piece.glyph === PIECES.BK.glyph)) {
      return true;
    }
  }
  return false;
}

/* ****** Piece definitions ****** */
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
// (0-based indices)
const WHITE_BACK_RANK = new Set([3, 10, 16, 21, 27]);
const BLACK_BACK_RANK = new Set([9, 15, 20, 26, 33]);
const WHITE_PAWN_INIT = new Set([4, 11, 17, 22, 28]);
const BLACK_PAWN_INIT = new Set([8, 14, 19, 25, 32]);

// Setup piece pools (we store codes; convert to PIECES[...] on placement)
const SETUP_POOL_W = ['WR', 'WN', 'WB', 'WQ', 'WK'];
const SETUP_POOL_B = ['BR', 'BN', 'BB', 'BQ', 'BK'];

/* ****** Move generators ****** */
// Export a cells-based dispatcher so Board can use it without touching G.
export function legalMovesFromCells(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const glyph = piece.glyph;

  if (glyph === PIECES.WP.glyph || glyph === PIECES.BP.glyph) return pawnMoves(cells, id);
  if (glyph === PIECES.WK.glyph || glyph === PIECES.BK.glyph) return kingMoves(cells, id);
  if (glyph === PIECES.WN.glyph || glyph === PIECES.BN.glyph) return knightMoves(cells, id);
  if (glyph === PIECES.WR.glyph || glyph === PIECES.BR.glyph) return rookMoves(cells, id);
  if (glyph === PIECES.WB.glyph || glyph === PIECES.BB.glyph) return bishopMoves(cells, id);
  if (glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph) return queenMoves(cells, id);
  return [];
}
// Backward-compatible wrapper used by server-side validation / AI
function pieceLegalMoves(G, id) {
  return legalMovesFromCells(G.cells, id);
}

const PAWN_CAPTURE_DIRS = { W: [1, 3], B: [0, 4] };

// Pawn: One or two steps forward, can capture diagonally; return legal moves
function pawnMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];

  const forward = piece.color === 'W' ? 2 : 5;  // W: (0,-1) up, B: (0,1) down
  const oneStep = stepIdxByDir(id, forward, 1);
  const twoSteps = stepIdxByDir(id, forward, 2);

  let legalMoves = [];

  // Single step forward (must be empty)
  if (oneStep != null && cells[oneStep] === null) legalMoves.push(oneStep);

  // Double step from starting rank (both squares must be empty)
  const onStart = piece.color === 'W' ? WHITE_PAWN_INIT.has(id) : BLACK_PAWN_INIT.has(id);
  if (onStart && oneStep != null && cells[oneStep] === null
    && twoSteps != null && cells[twoSteps] === null) {
    legalMoves.push(twoSteps);
  }

  // Captures
  for (const direction of PAWN_CAPTURE_DIRS[piece.color]) {
    const target = stepIdxByDir(id, direction, 1);
    if (target != null) {
      const occupied = cells[target];
      if (occupied && occupied.color !== piece.color) legalMoves.push(target);
    }
  }
  return legalMoves;
}

// King: one step in any orthogonal direction
function kingMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const legalMoves = [];
  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const target = stepIdxByDir(id, dirIdx, 1);
    if (target == null) continue;
    const occupied = cells[target];
    if (occupied == null || occupied.color !== piece.color) legalMoves.push(target);
  }
  return legalMoves;
}

// Knight: 2 in a dir, then 1 in adjacent dir (jump)
function knightMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const { q, r } = GRID[id];
  const legalMoves = new Set();

  for (let direction = 0; direction < 6; direction++) {
    const [dq, dr] = AXIAL_DIRS[direction];
    const [lq, lr] = AXIAL_DIRS[(direction + 5) % 6];
    const [rq, rr] = AXIAL_DIRS[(direction + 1) % 6];
    const left = idxOf(q + 2 * dq + lq, r + 2 * dr + lr);
    const right = idxOf(q + 2 * dq + rq, r + 2 * dr + rr);

    for (const target of [left, right]) {
      if (target != null) {
        const occupied = cells[target];
        if (!occupied || occupied.color !== piece.color) legalMoves.add(target);
      }
    }
  }
  return [...legalMoves];
}

// Rook: vertical slides
function rookMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const directions = [2, 5];
  return directions.flatMap(d => slide(cells, id, d));
}

// Bishop: non-vertical slides
function bishopMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const directions = [0, 1, 3, 4];
  return directions.flatMap(d => slide(cells, id, d));
}

// Queen: any orthogonal slide
function queenMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const directions = [0, 1, 2, 3, 4, 5];
  return directions.flatMap(d => slide(cells, id, d));
}

/* ****** Game logic ****** */
export const HexChess = {
  name: "hex-chess",

  setup: () => {
    const cells = Array(37).fill(null);

    // Pawns only in setup
    WHITE_PAWN_INIT.forEach((n) => (cells[n] = PIECES.WP));
    BLACK_PAWN_INIT.forEach((n) => (cells[n] = PIECES.BP));

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
      moves: {
        // Setup move: place one non-pawn piece on your back rank
        placePiece: ({ G, ctx }, targetIndex, pieceCode) => {
          const color = ctx.currentPlayer === '0' ? 'W' : 'B';
          const backRank = color === 'W' ? WHITE_BACK_RANK : BLACK_BACK_RANK;

          // Validate
          if (!backRank.has(targetIndex)) return INVALID_MOVE;
          if (G.cells[targetIndex] != null) return INVALID_MOVE;
          if (!G.setupPool[color].includes(pieceCode)) return INVALID_MOVE;
          if (!PIECES[pieceCode] || PIECES[pieceCode].color !== color) return INVALID_MOVE;

          // Place
          G.cells[targetIndex] = PIECES[pieceCode];
          // Remove from pool
          const idx = G.setupPool[color].indexOf(pieceCode);
          G.setupPool[color].splice(idx, 1);
        },
      },
      turn: { moveLimit: 1 }, // alternate automatically
      endIf: ({ G }) => !!G.setupPool && G.setupPool.W?.length === 0 && G.setupPool.B?.length === 0,
      next: "play",
    },

    play: {
      moves: {
        // Atomic human/AI move
        play: ({ G, ctx }, from, to) => {
          if (!isLegalPlay(G, ctx, from, to)) return INVALID_MOVE;
          applyPlay(G, from, to);
        },
      },
      turn: { moveLimit: 1 }, // alternate automatically
      endIf: ({ G, ctx }) => {
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
    },
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
