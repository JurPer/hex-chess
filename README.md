# Hex Chess

A small turn-based board game you can play in the browser. It is basically [Starchess](<[url](https://en.wikipedia.org/wiki/Hexagonal_chess#Starchess)>), a hexagonal chess-variant, but with added pieces.

## What is this?

- A playable prototype built with [React](<[url](https://react.dev/)>) and [boardgame.io](<[url](https://boardgame.io/)>).
- The goal is to **capture your opponent’s king**.

## The Board

- **Shape**: a horizontally oriented regular hexagram, consisting of 37 numbered cells.
- **Orientation**: orthogonal directions are defined as the six directions to a cell's edge-adjacent neighbours. (N, NW, SW, S, SE, NE)

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

- Pawns that reach the opponent’s back rank promote to a **queen** immediately.

## Piece movement

All moves follow the hexagrams orthogonal directions.

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

## Running locally

1. Install

`npm install`

2. Start the dev server

`npm run dev`

3. Open the printed localhost URL in your browser.

## Project structure (overview)

- hexGrid.js – Board shape and coordinate helpers (axial directions, index lookup).
- rules.js – Pure rules: piece metadata, setup constants, move definitions
- Game.js – boardgame.io glue: phases (setup → play), moves (placePiece, placeAllFixed, placeAllRandom, play), and simple AI enumeration.
- Board.jsx – React board: renders the grid, highlights legal moves, handles selection and setup UI.

## License

- MIT
