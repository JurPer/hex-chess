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
  G.cells[to] = G.cells[from];
  G.cells[from] = null;
  G.selected = null;
  G.legalMoves = [];
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
  const glyph = color === 'W' ? PIECES.WK.glyph : PIECES.BK.glyph;;
  for (let i = 0; i < cells.length; i++) {
    const piece = cells[i];
    if (piece && piece.glyph === glyph) return i;
  }
  return -1; // captured
}

// Is the king of color attacked in this cells array?
function isKingAttacked(cells, kingColor) {
  // locate king
  let kingId = kingIndex(cells, kingColor);
  if (kingId < 0) return true; // no king found -> considered attacked

  const oppColor = kingColor === 'W' ? 'B' : 'W';

  // 1) Pawn attacks: (pawn capture diagonally and are symmetrical)
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
  //    Rook on vertical dirs: 2,5. Bishop on non-vertical: 0,1,3,4.
  //    Queen on all dirs. We ray out from the king until a blocker.
  const rookDirs = [2, 5];
  const bishopDirs = [0, 1, 3, 4];

  const isSlideAttacked = (dirs, isAttacker) => {
    for (const direction of dirs) {
      let current = kingId;
      while (true) {
        const next = stepIdxByDir(current, direction, 1);
        if (next == null) break; // out of bounds
        const piece = cells[next];
        if (!piece) { current = next; continue; } // empty -> keep going
        if (piece.color === oppColor && isAttacker(piece.glyph)) return true; // first piece is attacker
        break; // own piece or blocking enemy that's not the right type
      }
    }
    return false;
  };

  // Rook or Queen
  if (isSlideAttacked(rookDirs, glyph => glyph === PIECES.WR.glyph || glyph === PIECES.BR.glyph
    || glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph)) {
    return true;
  }
  // Bishop or Queen
  if (isSlideAttacked(bishopDirs, glyph => glyph === PIECES.WB.glyph || glyph === PIECES.BB.glyph
    || glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph)) {
    return true;
  }

  // 4) Opposing king adjacent (rare but possible in your rules)
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

/* ****** Move logic ****** */

const PAWN_CAPTURE_DIRS = { W: [1, 3], B: [0, 4] };

// returns an array of all legal moves (ids) for the piece id
function pieceLegalMoves(G, id) {
  const piece = G.cells[id];
  if (!piece) return [];
  const glyph = piece.glyph;

  // save all legal moves for the selected piece
  let legalMoves = [];
  if (glyph === PIECES.WP.glyph || glyph === PIECES.BP.glyph) {
    legalMoves = pawnMoves(G.cells, id);
  } else if (glyph === PIECES.WK.glyph || glyph === PIECES.BK.glyph) {
    legalMoves = kingMoves(G.cells, id);
  } else if (glyph === PIECES.WN.glyph || glyph === PIECES.BN.glyph) {
    legalMoves = knightMoves(G.cells, id);
  } else if (glyph === PIECES.WR.glyph || glyph === PIECES.BR.glyph) {
    legalMoves = rookMoves(G.cells, id);
  } else if (glyph === PIECES.WB.glyph || glyph === PIECES.BB.glyph) {
    legalMoves = bishopMoves(G.cells, id);
  } else if (glyph === PIECES.WQ.glyph || glyph === PIECES.BQ.glyph) {
    legalMoves = queenMoves(G.cells, id);
  }

  // no logging here because it kills ai performance

  return legalMoves;
}

// Pawn: One or two steps forward, can capture diagonally; return legal moves
function pawnMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];

  const forward = piece.color === 'W' ? 2 : 5;  // W: (0,-1) up, B: (0,1) down
  const oneStep = stepIdxByDir(id, forward, 1);
  const twoSteps = stepIdxByDir(id, forward, 2);

  let legalMoves = [];

  // Single step forward (must be empty)
  if (oneStep != null && cells[oneStep] === null)
    legalMoves.push(oneStep);

  // Double step from starting rank (both squares must be empty)
  const onStart = piece.color === 'W'
    ? WHITE_PAWN_INIT.has(id)
    : BLACK_PAWN_INIT.has(id);
  if (onStart && oneStep != null && cells[oneStep] === null
    && twoSteps != null && cells[twoSteps] === null) {
    legalMoves.push(twoSteps);
  }

  for (const direction of (PAWN_CAPTURE_DIRS[piece.color])) {
    const target = stepIdxByDir(id, direction, 1);
    if (target != null) {
      const occupied = cells[target];
      if (occupied && occupied.color !== piece.color) legalMoves.push(target);
    }
  }

  return legalMoves;
}

// King: one step in any orthogonal direction (can capture enemy): return legal moves
function kingMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];

  const legalMoves = [];
  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const target = stepIdxByDir(id, dirIdx, 1);
    if (target == null) continue;  // not on the board
    const occupied = cells[target];
    if (occupied == null || occupied.color !== piece.color) legalMoves.push(target);
  }
  return legalMoves;
}

// Knight: 2 steps along any orthogonal direction, then 1 step in adjacent dir (left or right).
// Ignores blockers; can capture enemy on landing.
function knightMoves(cells, id) {
  const piece = cells[id];
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
        const occupied = cells[target];
        if (!occupied || occupied.color !== piece.color) legalMoves.add(target);
      }
    }
  }
  return [...legalMoves];
}

// Rook: slides in vertical direction (can capture enemy): return legal moves
function rookMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const directions = [2, 5]; // vertical only (up, down)

  return directions.flatMap(d => slide(cells, id, d));
}

// Bishop: slides in non-vertical directions (can capture enemy): return legal moves
function bishopMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const directions = [0, 1, 3, 4]; // non-vertical

  return directions.flatMap(d => slide(cells, id, d));
}

// Queen: slides in any orthogonal direction (can capture enemy): return legal moves
function queenMoves(cells, id) {
  const piece = cells[id];
  if (!piece) return [];
  const directions = [0, 1, 2, 3, 4, 5]; // all orthogonal directions

  return directions.flatMap(d => slide(cells, id, d));
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
    clickCell: ({ G, ctx, events }, id) => {
      // player with playerID "0" is always white at the moment
      const myColor = colorToMove(ctx);

      // nothing is selected yet
      if (G.selected === null) {
        // click on empty cell
        if (G.cells[id] === null) return INVALID_MOVE;
        // click on enemy piece 
        if (G.cells[id].color != myColor) return INVALID_MOVE;

        // valid piece selected
        G.selected = id;
        G.legalMoves = pieceLegalMoves(G, id);

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
            G.selected = id;
            G.legalMoves = pieceLegalMoves(G, id);
            return;
          };
          return INVALID_MOVE;
        }

        applyPlay(G, G.selected, id);
        events.endTurn();
      }
    },

    aiPlay: ({ G, ctx, events }, from, to) => {
      if (!isLegalPlay(G, ctx, from, to)) return INVALID_MOVE;
      applyPlay(G, from, to);
      events.endTurn();
    },
  },

  endIf: ({ G, ctx }) => {
    // 1) King captured?
    const whiteKingAlive = G.cells.some(c => c && c.glyph === PIECES.WK.glyph);
    const blackKingAlive = G.cells.some(c => c && c.glyph === PIECES.BK.glyph);

    if (!whiteKingAlive && !blackKingAlive) return { draw: true };
    if (!whiteKingAlive) return { winner: '1' }; // Black wins
    if (!blackKingAlive) return { winner: '0' }; // White wins

    // 2) No legal moves for the side to move? -> draw
    // I think this is impossible with the current rule set, but we keep it in, just in case
    if (!playerHasAnyMove(G, colorToMove(ctx))) return { draw: true };

    // Otherwise, game continues
    return;
  },


  // no logging here because it kills ai performance
  ai: {
    enumerate: (G, ctx) => {
      const color = colorToMove(ctx);

      // Generate all legal atomic moves for the side to move
      const allMoves = generateAllMoves(G, color);

      // King-safety pruning: drop moves that allow immediate king capture
      const safeMoves = allMoves.filter(({ from, to }) => {
        const nextCells = nextStateCells(G.cells, from, to);
        return !isKingAttacked(nextCells, color);
      });

      // if none safe, play anything
      const chosenMoves = safeMoves.length ? safeMoves : allMoves;

      // sort by captures first
      chosenMoves.sort((a, b) => (G.cells[b.to] ? 1 : 0) - (G.cells[a.to] ? 1 : 0));

      // Return atomic moves for MCTS
      return chosenMoves.map(({ from, to }) => ({ move: 'aiPlay', args: [from, to] }));
    },
  },
};
