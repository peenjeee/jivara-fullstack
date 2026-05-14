import { Router } from "express";
import * as publicStatsController from "../controllers/public-stats.controller";

const router = Router();

router.get("/stats", publicStatsController.getPublicStats);

export default router;
