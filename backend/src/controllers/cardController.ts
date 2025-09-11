import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { CardService } from "../services/cardService";
import { NotificationService } from "../services/notificationService";
import { AuditService } from "../services/auditService";
import { getIO } from "../utils/realtime";


export class CardController {
  static async createCard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });

      const card = await CardService.createAuthorized(
        {
          boardId: req.body.boardId,
          columnId: req.body.columnId,
          title: req.body.title,
          description: req.body.description ?? null,
          assigneeId: req.body.assigneeId ?? null,
          labels: req.body.labels ?? [],
          dueDate: req.body.dueDate ?? null,
          position: req.body.position,
        },
        req.user.id
      );

      await AuditService.append(card.board_id, req.user.id, "CardCreated", { cardId: card.id });
      getIO().to(`board:${card.board_id}`).emit("card:created", { card });

      // Optional: notify assignee
      if (card.assignee_id) {
        try {
          await NotificationService.notifyAssigned(card.assignee_id, {
            cardId: card.id,
            boardId: card.board_id,
            columnId: card.column_id,
            title: card.title,
          });
        } catch {
          /* ignore notification errors */
        }
      }

      return res.status(201).json(card);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async updateCard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;
      const { version, ...patch } = req.body; // optimistic lock

      const card = await CardService.updateAuthorized(id, req.user.id, version, patch);
      await AuditService.append(card.board_id, req.user.id, "CardUpdated", { cardId: id, patch });
      getIO().to(`board:${card.board_id}`).emit("card:updated", { card });

      return res.json(card);
    } catch (err: any) {
      if (String(err.message || "").includes("version conflict")) {
        return res.status(409).json({ error: "Version conflict. Fetch latest card and retry." });
      }
      return res.status(400).json({ error: err.message });
    }
  }

  static async moveCard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { cardId } = req.params;
      const { toColumnId, toIndex, version } = req.body;

      const card = await CardService.moveAuthorized(cardId, req.user.id, version, {
        toColumnId,
        toIndex,
      });

      await AuditService.append(card.board_id, req.user.id, "CardMoved", {
        cardId,
        toColumnId,
        toIndex,
      });
      getIO().to(`board:${card.board_id}`).emit("card:moved", { cardId, toColumnId, toIndex });

      return res.json(card);
    } catch (err: any) {
      if (String(err.message || "").includes("version conflict")) {
        return res.status(409).json({ error: "Version conflict. Fetch latest card and retry." });
      }
      return res.status(400).json({ error: err.message });
    }
  }

  static async deleteCard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;

      const info = await CardService.deleteAuthorized(id, req.user.id);
      await AuditService.append(info.boardId, req.user.id, "CardDeleted", { cardId: id });
      getIO().to(`board:${info.boardId}`).emit("card:deleted", { cardId: id });

      return res.json({ message: "Card deleted" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
