"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notificationService_1 = require("../services/notificationService");
class NotificationController {
    // Get user's notifications
    static async getUserNotifications(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const { limit, offset, unread } = req.query;
            const notifications = await notificationService_1.NotificationService.getUserNotifications(req.user.id, limit ? parseInt(limit) : undefined, offset ? parseInt(offset) : undefined, unread === "true");
            res.json(notifications);
        }
        catch (error) {
            console.error("Get user notifications error:", error);
            res.status(500).json({ error: "Failed to fetch notifications" });
        }
    }
    // Mark notification as read
    static async markAsRead(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const { id } = req.params;
            await notificationService_1.NotificationService.markAsRead(id, req.user.id);
            res.json({ message: "Notification marked as read" });
        }
        catch (error) {
            console.error("Mark as read error:", error);
            res.status(500).json({ error: "Failed to mark notification as read" });
        }
    }
    // Mark all notifications as read
    static async markAllAsRead(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            await notificationService_1.NotificationService.markAllAsRead(req.user.id);
            res.json({ message: "All notifications marked as read" });
        }
        catch (error) {
            console.error("Mark all as read error:", error);
            res
                .status(500)
                .json({ error: "Failed to mark all notifications as read" });
        }
    }
    // Get unread notification count
    static async getUnreadCount(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const count = await notificationService_1.NotificationService.getUnreadCount(req.user.id);
            res.json({ count });
        }
        catch (error) {
            console.error("Get unread count error:", error);
            res.status(500).json({ error: "Failed to get unread count" });
        }
    }
    // Delete notification
    static async deleteNotification(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const { id } = req.params;
            await notificationService_1.NotificationService.deleteNotification(id, req.user.id);
            res.status(204).send();
        }
        catch (error) {
            console.error("Delete notification error:", error);
            res.status(500).json({ error: "Failed to delete notification" });
        }
    }
}
exports.NotificationController = NotificationController;
