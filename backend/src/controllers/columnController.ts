import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { ColumnService } from "../services/columnService";
import { AuditService } from "../services/auditService";
import { getIO } from "../utils/realtime";

export class ColumnController {
  static async createColumn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { boardId, title, position } = req.body;

      const col = await ColumnService.createAuthorized(boardId, req.user.id, { title, position });
      await AuditService.append(boardId, req.user.id, "ColumnCreated", { columnId: col.id });
      getIO().to(`board:${boardId}`).emit("column:created", { column: col });

      return res.status(201).json(col);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async updateColumn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;

      const col = await ColumnService.updateAuthorized(id, req.user.id, { title: req.body.title });
      await AuditService.append(col.board_id, req.user.id, "ColumnUpdated", { columnId: id });
      getIO().to(`board:${col.board_id}`).emit("column:updated", { column: col });

      return res.json(col);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async deleteColumn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;

      const info = await ColumnService.deleteAuthorized(id, req.user.id);
      await AuditService.append(info.boardId, req.user.id, "ColumnDeleted", { columnId: id });
      getIO().to(`board:${info.boardId}`).emit("column:deleted", { columnId: id });

      return res.json({ message: "Column deleted" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async reorderColumns(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { boardId, order } = req.body; // [{columnId, position}]

      await ColumnService.reorderAuthorized(boardId, req.user.id, order);
      await AuditService.append(boardId, req.user.id, "ColumnReordered", { order });
      getIO().to(`board:${boardId}`).emit("column:reordered", { order });

      return res.json({ message: "Reordered" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
