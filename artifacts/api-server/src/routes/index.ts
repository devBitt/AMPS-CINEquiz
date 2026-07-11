import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import participantsRouter from "./participants.js";
import competitionRouter from "./competition.js";
import roundsRouter from "./rounds.js";
import qualificationsRouter from "./qualifications.js";
import adminRouter from "./admin.js";
import submissionsRouter from "./submissions.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/participants", participantsRouter);
router.use("/competition", competitionRouter);
router.use("/rounds", roundsRouter);
router.use("/qualifications", qualificationsRouter);
router.use("/admin", adminRouter);
router.use("/submissions", submissionsRouter);

export default router;
