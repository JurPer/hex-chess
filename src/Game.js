import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';
import { hexagonStarAxial } from "./hexGrid.js";

// Board Grid
export const GRID = hexagonStarAxial(2);

/* ****** Helper variables and functions ****** */

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
// slide along one orthogonal direction until blocked
function slide(G, fromIdx, dirIdx) {
  const out = [];
  const myColor = G.cells[fromIdx].color;

  let cur = fromIdx;
  while (true) {
    const nxt = stepIdxByDir(cur, dirIdx, 1);
    if (nxt == null) break;

    const occ = G.cells[nxt];
    if (occ == null) {          // empty: can continue
      out.push(nxt);
      cur = nxt;
      continue;
    }
    if (occ.color !== myColor) {// first enemy: capture and stop
      out.push(nxt);
    }
    break;                      // own piece or enemy — stop the ray
  }
  return out;
}


/* ****** Piece definitions ****** */
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

/* ****** Selection ****** */
// returns the index of the selected piece and an array of all legal moves (ids)
function selectPiece(G, id) {
  const piece = G.cells[id];

  // save all legal moves for the selected piece
  let legalMoves = [];
  if (piece.glyph === PIECES.WP.glyph || piece.glyph === PIECES.BP.glyph) {
    legalMoves = pawnMoves(G, id);
  } else if (piece.glyph === PIECES.WK.glyph || piece.glyph === PIECES.BK.glyph) {
    legalMoves = kingMoves(G, id);
  } else if (piece.glyph === PIECES.WN.glyph || piece.glyph === PIECES.BN.glyph) {
    legalMoves = knightMoves(G, id);
  } else if (piece.glyph === PIECES.WR.glyph || piece.glyph === PIECES.BR.glyph) {
    legalMoves = rookMoves(G, id);
  } else if (piece.glyph === PIECES.WB.glyph || piece.glyph === PIECES.BB.glyph) {
    legalMoves = bishopMoves(G, id);
  } else if (piece.glyph === PIECES.WQ.glyph || piece.glyph === PIECES.BQ.glyph) {
    legalMoves = queenMoves(G, id);
  } else {
    legalMoves = [];
  }

  console.log('legalMoves ids', legalMoves);

  return [id, legalMoves];
}

/* ****** Move logic ****** */
// Pawn: One or two steps forward, can capture diagonally; return legal moves
function pawnMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];

  const forward = piece.color === 'W' ? 2 : 5;  // W: (0,-1) up, B: (0,1) down
  const oneStep = stepIdxByDir(id, forward, 1);
  const twoSteps = stepIdxByDir(id, forward, 2);

  let legalMoves = [];

  // Single step forward (must be empty)
  if (oneStep != null && G.cells[oneStep] === null)
    legalMoves.push(oneStep);

  // Double step from starting rank (both squares must be empty)
  const onStart = piece.color === 'W'
    ? WHITE_PAWN_INIT.has(id)
    : BLACK_PAWN_INIT.has(id);
  if (onStart && oneStep != null && G.cells[oneStep] === null
    && twoSteps != null && G.cells[twoSteps] === null) {
    legalMoves.push(twoSteps);
  }

  // dirs: 1 == [1, -1], 3 == [-1, 0], 0 == [1, 0], 4 == [-1, 1]
  const dir_capture = piece.color === 'W'
    ? [1, 3]
    : [0, 4];

  for (const direction of dir_capture) {
    const target = stepIdxByDir(id, direction, 1);
    if (target != null) {
      const occupied = G.cells[target];
      if (occupied && occupied.color !== piece.color) legalMoves.push(target);
    }
  }

  return legalMoves;
}

// King: one step in any orthogonal direction (can capture enemy): return legal moves
function kingMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];

  const legalMoves = [];
  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const target = stepIdxByDir(id, dirIdx, 1);
    if (target == null) continue;  // not on the board
    const occupied = G.cells[target];
    if (occupied == null || occupied.color !== piece.color) legalMoves.push(target);
  }
  return legalMoves;
}

// Knight: 2 steps along any orthogonal direction, then 1 step in adjacent dir (left or right).
// Ignores blockers; can capture enemy on landing.
function knightMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];

  const { q, r } = GRID[id];
  const legalMoves = new Set();

  for (let direction = 0; direction < 6; direction++) {
    const [dq, dr] = AXIAL_DIRS[direction];
    const [lq, lr] = AXIAL_DIRS[(direction + 5) % 6]; // turn left
    const [rq, rr] = AXIAL_DIRS[(direction + 1) % 6]; // turn right
    const left = idxOf(q + 2 * dq + lq, r + 2 * dr + lr); // turn left 60°
    const right = idxOf(q + 2 * dq + rq, r + 2 * dr + rr); // turn right 60°

    for (const target of [left, right]) {
      if (target != null) {
        const occupied = G.cells[target];
        if (!occupied || occupied.color !== piece.color) legalMoves.add(target);
      }
    }
  }
  return [...legalMoves];
}

// Rook: slides in vertical direction (can capture enemy): return legal moves
function rookMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];
  const directions = [2, 5]; // vertical only (up, down)

  return directions.flatMap(d => slide(G, id, d));
}

// Bishop: slides in non-vertical directions (can capture enemy): return legal moves
function bishopMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];
  const directions = [0, 1, 3, 4]; // non-vertical

  return directions.flatMap(d => slide(G, id, d));
}

// Queen: slides in any orthogonal direction (can capture enemy): return legal moves
function queenMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];
  const directions = [0, 1, 2, 3, 4, 5]; // all orthogonal directions

  return directions.flatMap(d => slide(G, id, d));
}

/* ****** Game logic ****** */
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
      legalMoves: [],
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
          G.legalMoves = [];
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
        G.legalMoves = [];
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
      // loop through all cells and add the legal moves of every piece
      // TODO: this does not work because when the ai does not select before moving,
      // therefore no piece is selected when the move command is issued
      // I probably have to separate select and move into different "moves"
      // possibly do this through Stages
      for (let i = 0; i < G.cells.length; i++) {
        if (G.cells[i] != null) { // found a piece
          // find all possible moves for the current piece and add them all
          [G.selected, G.legalMoves] = selectPiece(G, i);
          for (const legalMove of G.legalMoves) {
            moves.push({ move: 'clickCell', args: [legalMove] });
          }
        }
      }
      return moves;
    },
  },
};
