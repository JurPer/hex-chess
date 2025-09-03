import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';

// --------- piece glyphs ----------
const WP = '♙', BP = '♟';
const WK = '♔', BK = '♚';
const WQ = '♕', BQ = '♛';
const WB = '♗', BB = '♝';
const WN = '♘', BN = '♞';
const WR = '♖', BR = '♜';

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
    BLACK.pawns.forEach((n) => (cells[n] = BP));
    cells[BLACK.king] = BK;
    cells[BLACK.knight] = BN;
    cells[BLACK.queen] = BQ;
    cells[BLACK.bishop] = BB;
    cells[BLACK.rook] = BR;

    // place white
    WHITE.pawns.forEach((n) => (cells[n] = WP));
    cells[WHITE.rook] = WR;
    cells[WHITE.queen] = WQ;
    cells[WHITE.bishop] = WB;
    cells[WHITE.knight] = WN;
    cells[WHITE.king] = WK;

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
    clickCell: ({ G, events }, id) => {
      if (G.selected == null) {
        // nothing selected

        // click on empty cell
        if (G.cells[id] == null) return INVALID_MOVE;

        // click on enemy piece return Invalid

        G.selected = id;
        return;
      } else {
        // piece is selected

        // deselect
        if (G.selected === id) {
          G.selected = null;
          return;
        }
        // check all possible moves for the selected piece. 
        // return invalid if cell is not in the list of possible moves

        G.cells[id] = G.cells[G.selected];
        G.cells[G.selected] = null;
        G.selected = null;
        events.endTurn();
        // 
      }
    },
  },

  /*   endIf: ({ G, ctx }) => {
    }, */
  ai: {
    enumerate: (G) => {
      let moves = [];
      for (let i = 0; i < 9; i++) {
        if (G.cells[i] === null) {
          moves.push({ move: 'select', args: [i] });
        }
      }
      return moves;
    },
  },
};

