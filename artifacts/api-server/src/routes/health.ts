import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

healthRouter.get("/server-time", (_req, res) => {
  res.json({ serverTime: Date.now() });
});

export default healthRouter;
