import express, { type Express } from "express";
import { createServer, type Server as HttpServer } from "node:http";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export { app, httpServer };
export default app;
