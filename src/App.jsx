import React from "react";
import "./App.css";

import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { Lobby } from "boardgame.io/react";
import { HexChess } from "./Game";
import { HexChessBoard } from "./Board";

class AppType {
  static Solo = new AppType("solo");
  static Multiplayer = new AppType("multiplayer");
  static Lobby = new AppType("lobby");

  constructor(name) {
    this.name = name;
  }
}

class App extends React.Component {
  state = { appType: null, playerID: null };

  render() {
    if (this.state.appType === null) {
      return (
        <div className="divTitle">
          <p>What app type to load?</p>
          <button
            className="buttonAppType"
            onClick={() => this.setState({ appType: AppType.Solo })}
          >
            Solo
          </button>
          <button
            className="buttonAppType"
            onClick={() => this.setState({ appType: AppType.Multiplayer })}
          >
            Multiplayer
          </button>
          <button
            className="buttonAppType"
            onClick={() => this.setState({ appType: AppType.Lobby })}
          >
            Lobby
          </button>
        </div>
      );
    }
    switch (this.state.appType) {
      case AppType.Multiplayer: {
        const HexChessClient = Client({
          game: HexChess,
          board: HexChessBoard,
          multiplayer: SocketIO({ server: "localhost:8000" }),
        });
        if (this.state.playerID === null) {
          return (
            <div className="divTitle">
              <p>Play as</p>
              <button
                className="buttonPlayer"
                onClick={() => this.setState({ playerID: "0" })}
              >
                Player 0
              </button>
              <button
                className="buttonPlayer"
                onClick={() => this.setState({ playerID: "1" })}
              >
                Player 1
              </button>
            </div>
          );
        }
        return (
          <div>
            <HexChessClient playerID={this.state.playerID} />
          </div>
        );
      }
      case AppType.Lobby:
        return (
          <Lobby
            className="lobbyStyle"
            gameServer={`http://${window.location.hostname}:8000`}
            lobbyServer={`http://${window.location.hostname}:8000`}
            gameComponents={[
              {
                game: HexChess,
                board: HexChessBoard,
              },
            ]}
          />
        );
      default: {
        const HexChessClient = Client({
          game: HexChess,
          board: HexChessBoard,
        });
        return (
          <div>
            <HexChessClient />
          </div>
        );
      }
    }
  }
}

export default App;
