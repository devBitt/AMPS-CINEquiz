import express, { type Express } from "express";
import { createServer, type Server as HttpServer } from "node:http";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();
const httpServer: HttpServer = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

// Serve frontend in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In dist/ (prod), __dirname is packages/api-server/dist
// In src/ (dev), __dirname is packages/api-server/src
// We want to point to packages/cinequiz/dist/public
const frontendPath = path.resolve(__dirname, "..", "..", "cinequiz", "dist", "public");

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  // Catch-all route for React Router
  app.use((req, res, next) => {
    // Only serve index.html for non-API GET requests
    if (req.method !== 'GET' || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  logger.warn(`Frontend build not found at ${frontendPath}. If this is production, please build the frontend first.`);
}

export { app, httpServer };
export default app;
