import { Router } from "express";
import * as alertController from "../controllers/alert.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert non-adherence untuk dashboard nurse/admin
 */

router.get("/", authorizeRoles("nurse", "admin"), alertController.listAlerts);
router.patch("/:id/resolve", authorizeRoles("nurse", "admin"), alertController.resolveAlert);

export default router;
