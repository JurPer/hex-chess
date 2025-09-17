# Hex Chess

A small turn-based board game you can [play in the browser](https://play-hex-chess.vercel.app/).

## What is this?

- basically [Starchess](<[url](https://en.wikipedia.org/wiki/Hexagonal_chess#Starchess)>), a hexagonal chess-variant, but with added pieces.
- playable prototype built with [Vite](https://vite.dev/)+[React](<[url](https://react.dev/)>) and [boardgame.io](<[url](https://boardgame.io/)>).
- hosted with [render](https://render.com/) and [vercel](https://vercel.com/)
- You can play on: https://play-hex-chess.vercel.app/.

## The Board

- **Shape**: a horizontally oriented regular hexagram, consisting of 37 numbered cells.
- **Orientation**: orthogonal directions are defined as the six directions to a cell's edge-adjacent neighbours (N, NW, SW, S, SE, NE); diagonal directions are defined as the six directions to a cell's corner (E, NE, NW, W, SW, SE).

## Setup Phase

Pawns start on the second rank like in chess.
At the beginning of the game, the players place five of their other pieces **alternately** on the cells behind their pawns.

- **White** back-rank cells: 4, 11, 17, 22, 28
- **Black** back-rank cells: 10, 16, 21, 27, 34

For convenience there are two buttons:

- **Place All (Fixed)**: places your remaining pieces down in a fixed order.
- **Place All (Random)**: places your remaining pieces down in a random order.

When both players have finished placing, the game automatically switches to the Play phase.

## Play Phase

- **Your turn**: Click one of your pieces to see its legal moves (shown as small grey dots), then click a destination cell to move.
- Move onto an opponent’s piece to **capture** it.
- Your turn **ends** after you move a piece.
- Unlike in chess, there is no "check".
- You **win** the game by capturing the opponent's king.
- The game is a **draw**, when a player has no legal move.

### Promotion

- **Pawns** that reach the opponent’s back rank promote to a **queen** immediately.

## Pieces

Moves usually follow the hexagrams orthogonal directions. The moon piece is an exception, as it can move on the diagonals.

### Pawn

- Moves one step straight forward (White moves “up”, Black moves “down”).
- Can move two steps from its starting cell if both cells are empty.
- Captures one step forward-left or forward-right.
- No en-passant.

### King

- Moves one step in any orthogonal direction.
- No castling.

### Knight

- Moves two steps in any orthogonal direction, then one step in an adjacent orthogonal direction. (an “L” on the hex grid).
- Knights jump over pieces in between.

### Rook

- Moves any number of steps vertically (straight up/down).

### Bishop

- Moves any number of steps along the non-vertical orthogonal directions.

### Queen

- Moves any number of steps in any orthogonal direction.

### Charger

- Moves any number of steps in any forward facing direction.
- White moves "up" | Black moves "down"

### Dragon

- Moves one or two steps in any orthogonal direction.
- If it moves two steps and captures an enemy piece, **ANY** piece in the intermediate cell is also captured.

### Guardian

- Moves one step in any orthogonal direction.
- Can swap places with a friendly piece.

### Fool

- Moves like the Knight and looks like one to the opponent.
- When captured, also removes the piece that captured it.

### Moon

- On even turns: moves like a bishop.
- On odd turns: moves any number of steps along the non-vertical diagonal directions.

## Running locally

1. Install

`npm install`

2. Start the dev server

`npm run dev`

3. Open the localhost URL in your browser.

## Project structure (overview)

- hexGrid.js – Board shape and coordinate helpers (axial directions, index lookup).
- rules.js – Pure rules: piece metadata, setup constants, move definitions.
- game.js – boardgame.io game: phases, moves, logging, and simple AI enumeration.
- board.jsx – React UI: renders the board, highlights legal moves, handles selection and setup UI.
- app.jsx - React UI: landing page and play mode selection. `VITE_SERVER_URL` is set on [vercel](https://vercel.com/) and links to the server on [render](https://render.com/).
- server.js - boardgame.io server. `CLIENT_ORIGIN` is set on [render](https://render.com/) and links to [vercel](https://vercel.com/).

## How to add more pieces (example: Rook)

1. rules.js/`PIECES`: add your piece for white and black. 'WR' and 'BR' are the **piece codes** for the rooks.

```
export const PIECES = {
  [...]
  WR: { color: 'W', glyph: '♖', kind: 'rook' },
  BR: { color: 'B', glyph: '♜', kind: 'rook' },
  [...]
}
```

2. rules.js/`SETUP_POOL`: add your **piece code** for white and black.

```
export const SETUP_POOL = Object.freeze({
  W: Object.freeze(['WK', 'WN', 'WB', 'WQ', 'WR', 'WC']),
  B: Object.freeze(['BK', 'BN', 'BB', 'BQ', 'BR', 'BC']),
});
```

3. rules.js: implement your **move** function. Cells simply contain the piece code as a string or null if empty. The move function returns an array of legal indices.

```
function rookMoves(cells, index) {
  const pieceCode = cells[index];
  if (!pieceCode) return [];
  const directions = [0, 3];
  return directions.flatMap(d => slide(cells, index, d));
}
```

4. rules.js/`legalMovesFromCells`: add your **move** function.

```
export function legalMovesFromCells(cells, index) {
  [...]
    case 'rook': return rookMoves(cells, index);
  [...]
}
```

5. (Optional) Some pieces may have special abilities that cannot be simply described by moving from one cell to another. In this case, you may need to implement additional logic in game.js/`applyPlay`. This may also be needed inside rules.js/`nextStateCells`, if you want the **AI** to include your move logic.

6. (Optional) rules.js/`isKingAttacked`: this function is used by the **AI** to not blunder their king in one turn. Also add your move logic here, if you want.

```
export function isKingAttacked(cells, kingColor) {
  [...]
  if (isSlideAttacked([2, 5], ['rook', 'queen'])) {
    return true;
  }
  [...]
}
```

7. (Optional) Add **images** of your pieces to the **assets** folder. Name them after your piece code (e.g. '**wr.svg**').

## Attributions

Images for Pawns, Kings, Knights, Rooks, Bishops, Queens:

- Cburnett, [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)

Images for Chargers:

- NikNaks93, [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)

Images for Dragons:

- Cburnett (knight); Conorpetersen (dragon), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)

Images for Guardians:

- Black: Sunny3113, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)
- White: Uray M. János, [GFDL](http://www.gnu.org/copyleft/fdl.html), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)

Images for Fools:

- [tdl44.png](https://commons.wikimedia.org/wiki/File:Chess_tdl44.png) and [tll44.png](https://commons.wikimedia.org/wiki/File:Chess_tll44.png): Mykol Dolgalov / derivative work: NikNaks93, [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/>), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)

Images for Moon:

- [wdl44.png](https://commons.wikimedia.org/wiki/File:Chess_wdl44.png) and [wll44.png](https://commons.wikimedia.org/wiki/File:Chess_wll44.png): OmegaChessFan / derivative work: NikNaks93, [CC BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces)

Image for chessboard icon:

- [Delapouite](https://delapouite.com/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [game-icons.net](https://game-icons.net/1x1/delapouite/empty-chessboard.html)

Sound effects for pieces:

- Move: el_boss, [Creative Commons 0](https://creativecommons.org/publicdomain/zero/1.0/), via [freesound.org](https://freesound.org/s/546119/)
- Capture: el_boss, [Creative Commons 0](https://creativecommons.org/publicdomain/zero/1.0/), via [freesound.org](https://freesound.org/s/546120/)

## License

MIT
