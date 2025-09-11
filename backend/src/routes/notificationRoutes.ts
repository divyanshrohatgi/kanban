import { Router } from "express";
import { NotificationController } from "../controllers/notificationController";
import { authenticateUser, requireAuth } from "../middlewares/auth";

const router = Router();

// All notification routes require authentication
router.use(authenticateUser, requireAuth);

router.get("/", NotificationController.getUserNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.put("/:id/read", NotificationController.markAsRead);
router.put("/mark-all-read", NotificationController.markAllAsRead);
router.delete("/:id", NotificationController.deleteNotification);

export default router;
