import { Server, Origins } from "boardgame.io/dist/cjs/server.js";
import { HexChess } from "./game.js";
//import express from 'express';
//import cors from 'cors';

// env
// eslint-disable-next-line no-undef
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
// eslint-disable-next-line no-undef
const appPort = Number(process.env.PORT ?? 8000);

/**
 * Server instance created from boardgame.io
 *
 * @type {Server}
 */
const server = Server({
  games: [HexChess],
  origins: [clientOrigin],
});

server.run(appPort);
