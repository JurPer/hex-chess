import React from "react";

import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { HexChess } from "../src/Game";
import { HexChessBoard } from "../src/Board";

const HexChessClient = Client({
    game: HexChess,
    board: HexChessBoard,
    multiplayer: SocketIO({ server: "localhost:8000" }),
});

class App extends React.Component {
    state = { playerID: null };

    render() {
        if (this.state.playerID === null) {
            return (
                <div>
                    <p>Play as</p>
                    <button onClick={() => this.setState({ playerID: "0" })}>Player 0</button>
                    <button onClick={() => this.setState({ playerID: "1" })}>Player 1</button>
                </div>
            );
        }
        return (
            <div>
                <HexChessClient playerID={this.state.playerID} />
            </div>
        );
    }
}

export default App;
