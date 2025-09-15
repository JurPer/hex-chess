/**
 * @typedef {'W'|'B'} Color
 * @typedef {{color: Color, glyph: string, kind: string}} Piece
 * @typedef {(string|null)[]} Cells
 * @typedef {'WR'|'WN'|'WB'|'WQ'|'WK'|'WC'|'BR'|'BN'|'BB'|'BQ'|'BK'|'BC'} PieceCode
 * @typedef {{cells: Cells, setupPool?: Record<Color, string[]>, [k: string]: any}} GameState
 * @typedef {{currentPlayer: '0'|'1', phase?: string, [k: string]: any}} Ctx
 */

import { INVALID_MOVE, TurnOrder } from 'boardgame.io/dist/cjs/core.js';
import {
  PAWN_START, SETUP_POOL, BACK_RANK,
  isBackRank, legalMovesFromCells, nextStateCells, isKingAttacked, colorOf, kindOf, isEnemy,
  dragonCollateral,
} from './shared/rules.js';

/**
 * Current side to move → `'W'` for player 0, `'B'` for player 1.
 * @param {Ctx} ctx
 * @returns {Color}
 */
const colorToMove = (ctx) => (ctx.currentPlayer === '0' ? 'W' : 'B');

/**
 * Turns a move into a string for the moves log.
 * `'S: '` for the setup. `'x'` for captures. `'o'` for guardian swap. `'=Q'` for promotion.
 *
 * @param {number} [from=null] 
 * @param {PieceCode} pieceCode 
 * @param {number} to 
 * @param {PieceCode} [targetCode=null] 
 * @param {boolean} [promoted=false] 
 * @returns {string} 
 */
function moveToString(from = null, pieceCode, to, targetCode = null, promoted = false) {
  let moveString = '';
  moveString += (from !== null ? (from + 1) : 'S: ');
  moveString += pieceCode.slice(1);
  if (targetCode)
    if (!isEnemy(pieceCode, targetCode))
      moveString += '🗘';
    else moveString += 'x';
  moveString += (to + 1);
  moveString += promoted ? '=Q' : '';
  moveString += kindOf(targetCode) === 'king' ? '#' : '';
  return moveString;
}

/**
 * Logs a move in the `movesLog`. Works with bulk placements.
 *
 * @param {GameState} G 
 * @param {Color} color 
 * @param {number} [from=null] 
 * @param {PieceCode} pieceCode 
 * @param {number} to 
 * @param {PieceCode} [targetCode=null] 
 * @param {boolean} [promoted=false] 
 */
function logMove(G, color, from = null, pieceCode, to, targetCode = null, promoted = false) {
  let index = 0;
  let foundGap = false;
  for (index; index < G.movesLog.length; index++) {
    if (G.movesLog[index][color] == null) {
      foundGap = true;
      break;
    }
  }
  const moveString = moveToString(from, pieceCode, to, targetCode, promoted)
  if (foundGap) {
    G.movesLog[index][color] = moveString;
  } else {
    let move = { W: null, B: null };
    move[color] = moveString;
    G.movesLog.push(move);
  }
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
  const targetCode = G.cells[to];

  // check special case for dragon moves
  if (kindOf(movedPieceCode) === 'dragon' && targetCode) {
    const collateralIndex = dragonCollateral(from, to);
    if (collateralIndex) G.cells[collateralIndex] = null;
  }

  // apply the move
  G.cells[to] = movedPieceCode;
  G.cells[from] = null;

  // check special case for guardian moves
  if (kindOf(movedPieceCode) === 'guardian' &&
    targetCode && !isEnemy(movedPieceCode, targetCode)) {
    G.cells[from] = targetCode;
  }

  // check pawn promotion if applicable; auto-queen for now
  let promoted = false;
  if (movedPieceCode === 'WP' && isBackRank('B', to)) {
    G.cells[to] = 'WQ';
    promoted = true;
  } else if (movedPieceCode === 'BP' && isBackRank('W', to)) {
    G.cells[to] = 'BQ';
    promoted = true;
  }

  logMove(G, colorOf(movedPieceCode), from, movedPieceCode, to, targetCode, promoted);
}


/**
 * Place all remaining pieces of the `setupPool` either in a fixed or random order. 
 *
 * @param {GameState} G 
 * @param {Color} color 
 * @param {RandomAPI} random 
 * @returns {INVALID_MOVE | void} 
 */
function placeAll(G, color, random) {
  const emptyBackRankCells = BACK_RANK[color].filter((i) => G.cells[i] === null);
  const setupPool = G.setupPool[color];
  const numberOfEmpties = emptyBackRankCells.length;

  if (numberOfEmpties === 0) return INVALID_MOVE;

  let remainingPool = [];
  // if the RandomAPI is provided, shuffle the remaining pool before placing pieces
  if (random) {
    remainingPool = random.Shuffle(setupPool.slice())
    // make sure the king is not left out
    const kingIndex = remainingPool.indexOf(color + 'K');
    if (kingIndex >= numberOfEmpties) {
      const swapIndex = random.Die(numberOfEmpties) - 1;
      [remainingPool[swapIndex], remainingPool[kingIndex]] = [remainingPool[kingIndex], remainingPool[swapIndex]];
    }
  } else remainingPool = SETUP_POOL[color].filter((code) => setupPool.includes(code));

  // fill every empty back-rank cell
  for (let k = 0; k < numberOfEmpties; k++) {
    const toIndex = emptyBackRankCells[k];
    const pieceCode = remainingPool[k];
    G.cells[toIndex] = pieceCode;
    logMove(G, color, null, pieceCode, toIndex, null, false);
    const j = setupPool.indexOf(pieceCode);
    if (j >= 0) setupPool.splice(j, 1);
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
  name: 'hex-chess',

  setup: () => {
    const cells = Array(37).fill(null);

    // Setup the pawns
    PAWN_START['W'].forEach((n) => (cells[n] = 'WP'));
    PAWN_START['B'].forEach((n) => (cells[n] = 'BP'));

    const setupPool = { W: [...SETUP_POOL['W']], B: [...SETUP_POOL['B']] };

    return {
      cells,
      phase: 'setup',
      setupPool,
      movesLog: [],
    };
  },

  turn: {
    minMoves: 1,
    maxMoves: 1,
    order: TurnOrder.RESET,
  },

  phases: {
    setup: {
      start: true,
      turn: {
        minMoves: 0,
        maxMoves: 1,
        onBegin: ({ G, ctx, events }) => {
          const color = colorToMove(ctx);
          const hasEmpty = BACK_RANK[color].some(i => G.cells[i] === null);
          if (!hasEmpty) events.endTurn();
        },
      },
      endIf: ({ G }) => {
        const isFullW = BACK_RANK.W.every(i => G.cells[i] !== null);
        const isFullB = BACK_RANK.B.every(i => G.cells[i] !== null);
        return isFullW && isFullB;
      },
      next: 'play',
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
          logMove(G, color, null, pieceCode, toIndex, null, false);
          // Remove from pool
          const index = G.setupPool[color].indexOf(pieceCode);
          if (index >= 0) G.setupPool[color].splice(index, 1);

          // if only one empty back-rank cell is left and the king was not placed, 
          // remove all pieces except the king
          const emptyBackRankCells = BACK_RANK[color].filter((i) => G.cells[i] === null);
          if (emptyBackRankCells.length === 1) {
            const kingIndex = G.setupPool[color].indexOf(color + 'K');
            if (kingIndex >= 0) G.setupPool[color] = [color + 'K'];
          }

        },
        // Automatically places all remaining pieces in fixed positions
        placeAllFixed: ({ G, ctx }) => {
          const color = colorToMove(ctx);
          placeAll(G, color, null);
        },
        // Automatically places all remaining pieces in random positions
        placeAllRandom: ({ G, ctx, random }) => {
          const color = colorToMove(ctx);
          placeAll(G, color, random);
        },

      },
    },

    play: {
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
    if (ctx.phase === 'setup') return;

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

        if (emptyBackRankCells.length === 0) return [];

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
