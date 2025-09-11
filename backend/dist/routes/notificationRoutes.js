"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(auth_1.authenticateUser, auth_1.requireAuth);
router.get("/", notificationController_1.NotificationController.getUserNotifications);
router.get("/unread-count", notificationController_1.NotificationController.getUnreadCount);
router.put("/:id/read", notificationController_1.NotificationController.markAsRead);
router.put("/mark-all-read", notificationController_1.NotificationController.markAllAsRead);
router.delete("/:id", notificationController_1.NotificationController.deleteNotification);
exports.default = router;
