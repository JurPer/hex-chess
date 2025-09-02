import { Client } from "boardgame.io/react";
import { HexChess } from "../src/Game";
import { HexChessBoard } from "../src/Board";

const App = Client({
    game: HexChess,
    board: HexChessBoard,
});

export default App;
