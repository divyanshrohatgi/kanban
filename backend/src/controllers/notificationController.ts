import { Request, Response } from "express";
import { NotificationService } from "../services/notificationService";
import { AuthenticatedRequest } from "../middlewares/auth";

export class NotificationController {
  // Get user's notifications
  static async getUserNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { limit, offset, unread } = req.query;

      const notifications = await NotificationService.getUserNotifications(
        req.user.id,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined,
        unread === "true"
      );

      res.json(notifications);
    } catch (error) {
      console.error("Get user notifications error:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }

  // Mark notification as read
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;

      await NotificationService.markAsRead(id, req.user.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      await NotificationService.markAllAsRead(req.user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all as read error:", error);
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read" });
    }
  }

  // Get unread notification count
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const count = await NotificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  }

  // Delete notification
  static async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;

      await NotificationService.deleteNotification(id, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  }
}
