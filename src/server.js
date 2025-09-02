/* 
const { Server, Origins } = require('boardgame.io/server');
const { HexChess } = require('./Game');
 */

import { Server, Origins } from "boardgame.io/dist/cjs/server.js";
import { HexChess } from "./Game.js";

const server = Server({
  games: [HexChess],
  origins: [Origins.LOCALHOST_IN_DEVELOPMENT],
});

server.run(8000);
