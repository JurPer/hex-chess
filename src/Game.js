import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';
import { hexagonStarAxial } from "./hexGrid.js";

// Board Grid
export const GRID = hexagonStarAxial(2);

// Build a quick index -> (q,r) and (q,r) -> index map from your GRID
export const IDX_BY_QR = new Map(GRID.map((c, i) => [`${c.q},${c.r}`, i]));
export const idxOf = (q, r) => {
  const v = IDX_BY_QR.get(`${q},${r}`);
  return v === undefined ? null : v;
};

// Piece definitions
const PIECES = {
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

// If a cell shows "9" on the board, its index here is 8, etc.
const WHITE_PAWN_INIT = new Set([4, 11, 17, 22, 28]);
const BLACK_PAWN_INIT = new Set([8, 14, 19, 25, 32]);
const WHITE = {
  pawns: WHITE_PAWN_INIT,
  rook: 3,
  queen: 10,
  bishop: 16,
  knight: 21,
  king: 27,
};
const BLACK = {
  pawns: BLACK_PAWN_INIT,
  king: 9,
  knight: 15,
  queen: 20,
  bishop: 26,
  rook: 33,
};

// Selection: returns the index of the selected piece and an array of all legal moves
function selectPiece(G, id) {
  // --- Pawn-only logic for now ---
  const piece = G.cells[id];

  // Only implement pawn movement for now
  const isPawn = piece && (piece.glyph === PIECES.WP.glyph || piece.glyph === PIECES.BP.glyph);
  if (!isPawn) return INVALID_MOVE;

  // save all possible pawn moves for the selected piece
  let legalMoves = [];
  legalMoves = pawnMoves(G, id);
  console.log('legalMoves ids', legalMoves);

  return [id, legalMoves];
}

// Move logic

// Compute legal pawn moves from a given index (returns array of destination indices)
function pawnMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];

  //const color = piece.color;             // 'W' or 'B'
  const { q, r } = GRID[id]; // axial coords for this index

  console.log('id:', id, '| q:', q, 'r:', r);

  // Forward direction in your flat-top grid:
  // White goes "up" => r - 1; Black goes "down" => r + 1
  const sign = piece.color === 'W' ? -1 : +1;

  const oneStep = idxOf(q, r + sign);
  const twoSteps = idxOf(q, r + 2 * sign);

  const out = [];

  // Single step forward (must be empty)
  if (oneStep != null && G.cells[oneStep] === null) out.push(oneStep);

  // Double step from starting rank (both squares must be empty)
  const onStart = piece.color === 'W'
    ? WHITE_PAWN_INIT.has(id)
    : BLACK_PAWN_INIT.has(id);
  if (onStart && oneStep != null && G.cells[oneStep] === null
    && twoSteps != null && G.cells[twoSteps] === null) {
    out.push(twoSteps);
  }

  // Captures: orthogonal left-forward / right-forward (relative to forward)
  // For this flat-top axial:
  //  - White captures at (q-1, r)  and (q+1, r-1)
  //  - Black captures at (q-1, r+1) and (q+1, r)
  const capOffsets = piece.color === 'W'
    ? [[-1, 0], [+1, -1]]
    : [[-1, +1], [+1, 0]];

  for (const [dq, dr] of capOffsets) {
    const target = idxOf(q + dq, r + dr);
    if (target != null) {
      const occupied = G.cells[target];
      if (occupied && occupied.color !== piece.color) out.push(target);
    }
  }

  return out;
}

// Game logic
export const HexChess = {
  name: "hex-chess",

  setup: () => {
    const cells = Array(37).fill(null);

    // place white
    WHITE.pawns.forEach((n) => (cells[n] = PIECES.WP));
    cells[WHITE.rook] = PIECES.WR;
    cells[WHITE.queen] = PIECES.WQ;
    cells[WHITE.bishop] = PIECES.WB;
    cells[WHITE.knight] = PIECES.WN;
    cells[WHITE.king] = PIECES.WK;

    // place black
    BLACK.pawns.forEach((n) => (cells[n] = PIECES.BP));
    cells[BLACK.king] = PIECES.BK;
    cells[BLACK.knight] = PIECES.BN;
    cells[BLACK.queen] = PIECES.BQ;
    cells[BLACK.bishop] = PIECES.BB;
    cells[BLACK.rook] = PIECES.BR;

    return {
      cells,
      selected: null,
      legalMoves: [null],
    };
  },

  turn: {
    minMoves: 1,
    //maxMoves: 1,
  },

  moves: {
    clickCell: ({ G, events, playerID }, id) => {
      // player with playerID "0" is always white at the moment
      const myColor = playerID === "0" ? 'W' : 'B';

      // nothing is selected yet
      if (G.selected === null) {
        // click on empty cell
        if (G.cells[id] === null) return INVALID_MOVE;
        // click on enemy piece 
        if (G.cells[id].color != myColor) return INVALID_MOVE;

        // valid piece selected
        [G.selected, G.legalMoves] = selectPiece(G, id);

        return;
      }
      // a valid piece is selected
      else {
        // deselect
        if (G.selected === id) {
          G.selected = null;
          G.legalMoves = null;
          return;
        }

        // target cell is not in the list of possible moves
        if (!G.legalMoves.includes(id)) {
          // reselect another of your own pieces
          if (G.cells[id].color === myColor) {
            [G.selected, G.legalMoves] = selectPiece(G, id);
            return;
          };
          return INVALID_MOVE;
        }


        // move the piece and end the players turn
        G.cells[id] = G.cells[G.selected];
        G.cells[G.selected] = null;
        G.selected = null;
        G.legalMoves = null;
        events.endTurn();
      }
    },
  },

  /*   endIf: ({ G, ctx }) => {
      // add logic to determine a winner and finish the game
    }, */


  ai: {
    enumerate: (G) => {
      let moves = [];
      for (let i = 0; i < GRID.length; i++) {
        if (G.cells[i] != null)
          // old TicTacToe logic: REWRITE so AI receives all possible moves
          moves.push({ move: 'clickCell', args: [i] });
      }
      return moves;
    },
  },
};
