import { Server } from "boardgame.io/dist/cjs/server.js";
import { HexChess } from "./game.js";

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


// Health check for Render
server.app.use(async (context, next) => {
  if (context.path === '/healthz') {
    context.status = 200;
    context.body = 'ok';
    return;
  }
  await next();
});

server.run({ port: appPort });
