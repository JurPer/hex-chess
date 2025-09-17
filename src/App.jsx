import React from 'react';
import './app.css';

import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { Lobby } from 'boardgame.io/react';
import { HexChess } from './game';
import HexChessBoard from './board';

/**
 * Enum-like type representing the application run mode.
 *
 * Provides three predefined, singleton instances: {@link AppType.Solo},
 * {@link AppType.Multiplayer}, and {@link AppType.Lobby}.
 *
 * @class AppType
 * @classdesc Represents a specific app mode (solo, multiplayer, lobby).
 */
class AppType {
  static Solo = new AppType('solo');
  static Multiplayer = new AppType('multiplayer');
  static Lobby = new AppType('lobby');

  constructor(name) {
    this.name = name;
  }
}

const serverURL = import.meta.env.PROD
  ? import.meta.env.VITE_SERVER_URL ?? ''
  : 'http://localhost:8000';

/**
 * Handles the landing page, asks for the app type and then loads the appropriate game component based on the user's choice.
 *
 * @class App
 * @extends {React.Component}
 */
class App extends React.Component {
  state = { appType: null, playerID: null };

  render() {
    if (this.state.appType === null) {
      return (
        <div className="app">
          <button onClick={() => this.setState({ appType: AppType.Solo })}>Solo</button>
          <button onClick={() => this.setState({ appType: AppType.Multiplayer })}>
            Multiplayer
          </button>
          <button onClick={() => this.setState({ appType: AppType.Lobby })}>Lobby</button>
        </div>
      );
    }
    switch (this.state.appType) {
      case AppType.Multiplayer: {
        const HexChessClient = Client({
          game: HexChess,
          board: HexChessBoard,
          multiplayer: SocketIO({ server: serverURL }),
        });
        if (this.state.playerID === null) {
          return (
            <div className="app">
              <p>Play as</p>
              <button onClick={() => this.setState({ playerID: '0' })}>White</button>
              <button onClick={() => this.setState({ playerID: '1' })}>Black</button>
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
          <div>
            <Lobby
              gameServer={serverURL}
              lobbyServer={serverURL}
              gameComponents={[
                {
                  game: HexChess,
                  board: HexChessBoard,
                },
              ]}
            />
          </div>
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
