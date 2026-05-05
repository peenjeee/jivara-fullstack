import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import { validatePreference, validateSendNotification, validateSubscribe } from "../validators/notification.validator";

const router = Router();

router.get("/public-key", notificationController.getPublicKey);

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Web Push subscription dan push notification PWA
 */

router.get("/", authorizeRoles("patient", "nurse", "admin"), notificationController.listNotifications);
router.post("/subscribe", authorizeRoles("patient"), validateSubscribe, notificationController.subscribe);
router.patch("/preferences", authorizeRoles("patient"), validatePreference, notificationController.updatePreference);
router.post("/send", authorizeRoles("nurse", "admin"), validateSendNotification, notificationController.sendNotification);

export default router;
