/**
 * @typedef {'W'|'B'} Color
 * @typedef {{color: Color, glyph: string, kind: string}} Piece
 * @typedef {(string|null)[]} Cells
 * @typedef {{cells: Cells, setupPool?: Record<Color, string[]>, [k: string]: any}} GameState
 * @typedef {{currentPlayer: '0'|'1', phase?: string, [k: string]: any}} Ctx
 */

import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';
import {
  PAWN_START, SETUP_POOL, BACK_RANK,
  isBackRank, legalMovesFromCells, nextStateCells, isKingAttacked, colorOf
} from "./shared/rules.js";

/**
 * Current side to move → `'W'` for player 0, `'B'` for player 1.
 * @param {Ctx} ctx
 * @returns {Color}
 */
const colorToMove = (ctx) => (ctx.currentPlayer === '0' ? 'W' : 'B');



/**
 * Turns a move into a string for the moves log.
 *
 * @param {number} [from=null] 
 * @param {string} pieceCode 
 * @param {number} to 
 * @param {boolean} [captured=false] 
 * @param {boolean} [promoted=false] 
 * @returns {string} 
 */
function moveToString(from = null, pieceCode, to, captured = false, promoted = false) {
  let moveString = '';
  moveString += (from !== null ? (from + 1) : 'S: ');
  moveString += pieceCode.slice(1) + (captured ? 'x' : '') + (to + 1) + (promoted ? '=Q' : '');
  return moveString;
}

/**
 * Does the player with `color` have at least one legal move?
 * @param {GameState} G
 * @param {Color} color
 * @returns {boolean}
 */
function playerHasAnyMove(G, color) {
  for (let i = 0; i < G.cells.length; i++) {
    const pieceCode = G.cells[i];
    if (!pieceCode || colorOf(pieceCode) !== color) continue;
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
  const pieceCode = G.cells[from];
  if (!pieceCode) return false;
  if (colorOf(pieceCode) !== colorToMove(ctx)) return false;
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
  const movedPieceCode = G.cells[from];
  const captured = G.cells[to] != null;
  G.cells[to] = movedPieceCode;
  G.cells[from] = null;

  let promoted = false;
  // check pawn promotion if applicable; auto-queen for now
  if (movedPieceCode === 'WP' && isBackRank("B", to)) {
    G.cells[to] = 'WQ';
    promoted = true;
  } else if (movedPieceCode === 'BP' && isBackRank("W", to)) {
    G.cells[to] = 'BQ';
    promoted = true;
  }

  G.movesLog.push(moveToString(from, movedPieceCode, to, captured, promoted));
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
    const pieceCode = G.cells[from];
    if (!pieceCode || colorOf(pieceCode) !== color) continue;
    const legalMoves = pieceLegalMoves(G, from);
    for (const to of legalMoves) moves.push({ from, to });
  }
  return moves;
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
 * Boardgame.io game definition for HexChess.
 * 
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
    PAWN_START["W"].forEach((n) => (cells[n] = 'WP'));
    PAWN_START["B"].forEach((n) => (cells[n] = 'BP'));

    const setupPool = { W: [...SETUP_POOL["W"]], B: [...SETUP_POOL["B"]] };

    return {
      cells,
      phase: "setup",
      setupPool,
      movesLog: [],
    };
  },

  phases: {
    setup: {
      start: true,
      turn: { moveLimit: 1 }, // alternate automatically
      endIf: ({ G }) => {
        return !!G.setupPool
          && (SETUP_POOL.W.length - G.setupPool.W?.length === 5)
          && (SETUP_POOL.B.length - G.setupPool.B?.length === 5)
      },
      next: "play",
      moves: {
        // place one non-pawn piece on your back rank
        placePiece: ({ G, ctx }, toIndex, pieceCode) => {
          const color = colorToMove(ctx);

          // Validate
          if (!isBackRank(color, toIndex)) return INVALID_MOVE;
          if (G.cells[toIndex] != null) return INVALID_MOVE;
          if (!G.setupPool[color].includes(pieceCode)) return INVALID_MOVE;
          if (!pieceCode || colorOf(pieceCode) !== color) return INVALID_MOVE;

          // Place
          G.cells[toIndex] = pieceCode;
          G.movesLog.push(moveToString(null, pieceCode, toIndex));
          // Remove from pool
          const index = G.setupPool[color].indexOf(pieceCode);
          G.setupPool[color].splice(index, 1);
        },
        // Automatically places all remaining pieces in fixed positions
        placeAllFixed: ({ G, ctx }) => {
          const color = colorToMove(ctx);
          const emptyBackRankCells = BACK_RANK[color].filter((i) => G.cells[i] === null);
          const setupPool = G.setupPool[color];

          if (setupPool.length === 0 || emptyBackRankCells.length === 0) return INVALID_MOVE;

          // Keep only the codes still in the player's pool, in fixed order
          const remainingInOrder = SETUP_POOL[color].filter((code) => setupPool.includes(code));

          // Place as many as we can (handles partial state gracefully)
          const n = Math.min(emptyBackRankCells.length, remainingInOrder.length);
          for (let k = 0; k < n; k++) {
            const toIndex = emptyBackRankCells[k];
            const pieceCode = remainingInOrder[k];
            G.cells[toIndex] = pieceCode;
            G.movesLog.push(moveToString(null, pieceCode, toIndex));
            // remove from pool
            const j = setupPool.indexOf(pieceCode);
            if (j >= 0) setupPool.splice(j, 1);
          }
        },
        // Automatically places all remaining pieces in random positions
        placeAllRandom: ({ G, ctx, random }) => {
          const color = colorToMove(ctx);
          const emptyBackRankCells = BACK_RANK[color].filter((i) => G.cells[i] === null);
          const setupPool = G.setupPool[color];

          if (setupPool.length === 0 || emptyBackRankCells.length === 0) return INVALID_MOVE;

          const shuffled = random.Shuffle(setupPool.slice());

          // Place as many as we can
          const n = Math.min(emptyBackRankCells.length, shuffled.length);
          for (let k = 0; k < n; k++) {
            const toIndex = emptyBackRankCells[k];
            const pieceCode = shuffled[k];
            G.cells[toIndex] = pieceCode;
            G.movesLog.push(moveToString(null, pieceCode, toIndex));
            // remove from pool
            const j = setupPool.indexOf(pieceCode);
            if (j >= 0) setupPool.splice(j, 1);
          }
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
    const whiteKingAlive = G.cells.some(c => c && c === 'WK');
    const blackKingAlive = G.cells.some(c => c && c === 'BK');

    if (!whiteKingAlive && !blackKingAlive) return { draw: true };
    if (!whiteKingAlive) return { winner: 'Black' }; // Black wins
    if (!blackKingAlive) return { winner: 'White' }; // White wins

    // 2) No legal moves for the side to move? -> draw (kept for future pieces)
    if (!playerHasAnyMove(G, colorToMove(ctx))) return { draw: true };

    return;
  },

  ai: {
    enumerate: (G, ctx) => {
      const color = colorToMove(ctx);

      // --- Setup phase ---
      if (ctx.phase === 'setup') {
        const emptyBackRankCells = BACK_RANK[color].filter((i) => G.cells[i] === null);
        const setupPool = G.setupPool?.[color] ?? [];

        // Nothing to do?
        if (setupPool.length === 0 || emptyBackRankCells.length === 0) return [];

        const moves = [];

        // Enumerate single-piece placements (keeps search branching sane)
        for (const index of emptyBackRankCells) {
          for (const code of setupPool) {
            moves.push({ move: 'placePiece', args: [index, code] });
          }
        }

        // (Optional) offer bulk placement shortcuts
        //moves.push({ move: 'placeAllFixed', args: [] });
        //moves.push({ move: 'placeAllRandom', args: [] });

        return moves;
      }

      // --- Play phase ---
      const allMoves = generateAllMoves(G, color);
      const safeMoves = allMoves.filter(({ from, to }) => {
        const nextCells = nextStateCells(G.cells, from, to);
        return !isKingAttacked(nextCells, color);
      });
      // if none safe, play anything
      const chosenMoves = safeMoves.length ? safeMoves : allMoves;
      // sort by captures first
      chosenMoves.sort((a, b) => (G.cells[b.to] ? 1 : 0) - (G.cells[a.to] ? 1 : 0));
      return chosenMoves.map(({ from, to }) => ({ move: 'play', args: [from, to] }));
    },
  },
};
