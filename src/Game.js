import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';
import { hexagonStarAxial } from "./hexGrid.js";

// board grid
const GRID = hexagonStarAxial(2);

// piece definitions
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
const BLACK = {
  pawns: [8, 14, 19, 25, 32],
  king: 9,
  knight: 15,
  queen: 20,
  bishop: 26,
  rook: 33,
};
const WHITE = {
  pawns: [4, 11, 17, 22, 28],
  rook: 3,
  queen: 10,
  bishop: 16,
  knight: 21,
  king: 27,
};

// Game Logic
export const HexChess = {
  name: "hex-chess",

  setup: () => {
    const cells = Array(37).fill(null);

    // place black
    BLACK.pawns.forEach((n) => (cells[n] = PIECES.BP));
    cells[BLACK.king] = PIECES.BK;
    cells[BLACK.knight] = PIECES.BN;
    cells[BLACK.queen] = PIECES.BQ;
    cells[BLACK.bishop] = PIECES.BB;
    cells[BLACK.rook] = PIECES.BR;

    // place white
    WHITE.pawns.forEach((n) => (cells[n] = PIECES.WP));
    cells[WHITE.rook] = PIECES.WR;
    cells[WHITE.queen] = PIECES.WQ;
    cells[WHITE.bishop] = PIECES.WB;
    cells[WHITE.knight] = PIECES.WN;
    cells[WHITE.king] = PIECES.WK;

    return {
      cells,
      selected: null,
    };
  },

  turn: {
    minMoves: 1,
    //maxMoves: 1,
  },

  moves: {
    clickCell: ({ G, events, playerID }, id) => {
      // player with playerID equal to "0" is always white at the moment
      const myColor = playerID === "0" ? 'W' : 'B';

      // nothing is selected yet
      if (G.selected == null) {
        // click on empty cell
        if (G.cells[id] == null) return INVALID_MOVE;
        // click on enemy piece 
        if (G.cells[id].color != myColor) return INVALID_MOVE;
        // valid piece selected
        G.selected = id;
        return;
      }
      // a valid piece is selected
      else {
        // deselect
        if (G.selected === id) {
          G.selected = null;
          return;
        }

        // check all possible moves for the selected piece. 
        // return invalid if cell is not in the list of possible moves

        // move the piece
        G.cells[id] = G.cells[G.selected];
        G.cells[G.selected] = null;
        G.selected = null;
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
          // TODO: old TicTacToe logic: REWRITE so AI receives all possible moves
          moves.push({ move: 'clickCell', args: [i] });
      }
      return moves;
    },
  },
};
