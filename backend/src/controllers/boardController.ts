import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { BoardService } from "../services/boardService";
import { AuditService } from "../services/auditService";
import { getIO } from "../utils/realtime";

export class BoardController {
  static async createBoard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { title, description = null, members = [] } = req.body;

      const board = await BoardService.create({
        title,
        description,
        ownerId: req.user.id,
        members, // [{ userId, role }]
      });

      await AuditService.append(board.id, req.user.id, "BoardCreated", { boardId: board.id });
      getIO().to(`board:${board.id}`).emit("board:created", { board });
      return res.status(201).json(board);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to create board" });
    }
  }

  static async getBoards(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const boards = await BoardService.listForUser(req.user.id);
      return res.json(boards);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async getBoardById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;
      const board = await BoardService.getByIdAuthorized(id, req.user.id);
      // Eager load columns and cards for persistence on refresh
      const full = await BoardService.getWithColumnsAndCards(id);
      return res.json({ ...board, columns: full.columns });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || "Board not found" });
    }
  }

  static async updateBoard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;

      const updated = await BoardService.updateAuthorized(id, req.user.id, {
        title: req.body.title,
        description: req.body.description ?? null,
      });

      await AuditService.append(id, req.user.id, "BoardUpdated", { changes: req.body });
      getIO().to(`board:${id}`).emit("board:updated", { board: updated });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async deleteBoard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { id } = req.params;

      await BoardService.deleteAuthorized(id, req.user.id);
      await AuditService.append(id, req.user.id, "BoardDeleted", {});
      getIO().to(`board:${id}`).emit("board:deleted", { boardId: id });
      return res.json({ message: "Board deleted" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { boardId } = req.params;
      const { userId, role } = req.body;

      const member = await BoardService.addMemberAuthorized(boardId, req.user.id, { userId, role });
      await AuditService.append(boardId, req.user.id, "BoardMemberAdded", { userId, role });
      getIO().to(`board:${boardId}`).emit("board:memberAdded", { userId, role });

      return res.status(201).json(member);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const { boardId } = req.params;
      const { userId } = req.body;

      await BoardService.removeMemberAuthorized(boardId, req.user.id, userId);
      await AuditService.append(boardId, req.user.id, "BoardMemberRemoved", { userId });
      getIO().to(`board:${boardId}`).emit("board:memberRemoved", { userId });

      return res.json({ message: "Member removed" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
