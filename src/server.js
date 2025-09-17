import { Server, Origins } from "boardgame.io/dist/cjs/server.js";
import { HexChess } from "./game.js";
import express from 'express';
import cors from 'cors';

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

const app = express();
app.use(cors({ origin: clientOrigin, credentials: true }));

// Basic health endpoint so Render can probe the service
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Start HTTP server and attach BGIO to it
const httpServer = app.listen(appPort, () => {
  console.log(`Server listening on ${appPort}`);
});


server.run({ port: httpServer });
