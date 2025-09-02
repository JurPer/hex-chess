import React from "react";

import { Lobby } from "boardgame.io/react";
import { HexChess } from "../src/Game";
import { HexChessBoard } from "../src/Board";

class App extends React.Component {
    render() {
        return (
            <Lobby
                gameServer={`https://${window.location.hostname}:8000`}
                lobbyServer={`https://${window.location.hostname}:8000`}
                gameComponents={[
                    {
                        game: HexChess,
                        board: HexChessBoard,
                    },
                ]}
            />
        );
    }
}

export default App;
