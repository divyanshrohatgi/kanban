"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardController = void 0;
const boardService_1 = require("../services/boardService");
const auditService_1 = require("../services/auditService");
const realtime_1 = require("../utils/realtime");
class BoardController {
    static async createBoard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { title, description = null, members = [] } = req.body;
            const board = await boardService_1.BoardService.create({
                title,
                description,
                ownerId: req.user.id,
                members, // [{ userId, role }]
            });
            await auditService_1.AuditService.append(board.id, req.user.id, "BoardCreated", { boardId: board.id });
            (0, realtime_1.getIO)().to(`board:${board.id}`).emit("board:created", { board });
            return res.status(201).json(board);
        }
        catch (err) {
            return res.status(400).json({ error: err.message || "Failed to create board" });
        }
    }
    static async getBoards(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const boards = await boardService_1.BoardService.listForUser(req.user.id);
            return res.json(boards);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async getBoardById(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            const board = await boardService_1.BoardService.getByIdAuthorized(id, req.user.id);
            // Eager load columns and cards for persistence on refresh
            const full = await boardService_1.BoardService.getWithColumnsAndCards(id);
            return res.json({ ...board, columns: full.columns });
        }
        catch (err) {
            return res.status(404).json({ error: err.message || "Board not found" });
        }
    }
    static async updateBoard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            const updated = await boardService_1.BoardService.updateAuthorized(id, req.user.id, {
                title: req.body.title,
                description: req.body.description ?? null,
            });
            await auditService_1.AuditService.append(id, req.user.id, "BoardUpdated", { changes: req.body });
            (0, realtime_1.getIO)().to(`board:${id}`).emit("board:updated", { board: updated });
            return res.json(updated);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async deleteBoard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            await boardService_1.BoardService.deleteAuthorized(id, req.user.id);
            await auditService_1.AuditService.append(id, req.user.id, "BoardDeleted", {});
            (0, realtime_1.getIO)().to(`board:${id}`).emit("board:deleted", { boardId: id });
            return res.json({ message: "Board deleted" });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async addMember(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { boardId } = req.params;
            const { userId, role } = req.body;
            const member = await boardService_1.BoardService.addMemberAuthorized(boardId, req.user.id, { userId, role });
            await auditService_1.AuditService.append(boardId, req.user.id, "BoardMemberAdded", { userId, role });
            (0, realtime_1.getIO)().to(`board:${boardId}`).emit("board:memberAdded", { userId, role });
            return res.status(201).json(member);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async removeMember(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { boardId } = req.params;
            const { userId } = req.body;
            await boardService_1.BoardService.removeMemberAuthorized(boardId, req.user.id, userId);
            await auditService_1.AuditService.append(boardId, req.user.id, "BoardMemberRemoved", { userId });
            (0, realtime_1.getIO)().to(`board:${boardId}`).emit("board:memberRemoved", { userId });
            return res.json({ message: "Member removed" });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.BoardController = BoardController;
