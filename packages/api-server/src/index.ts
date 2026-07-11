process.env["NODE_ENV"] = process.env["NODE_ENV"] || "development";

import { app, httpServer } from "./app.js";
import { initializeSocketIO } from "./services/socketService.js";
import { logger } from "./lib/logger.js";

// Initialize database on startup (called inside getDb())
import "./database/db.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

// Make io available to routes via req.app.get("io")
app.set("io", io);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "CineQuiz server listening");
});
