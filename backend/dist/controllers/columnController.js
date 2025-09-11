"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnController = void 0;
const columnService_1 = require("../services/columnService");
const auditService_1 = require("../services/auditService");
const realtime_1 = require("../utils/realtime");
class ColumnController {
    static async createColumn(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { boardId, title, position } = req.body;
            const col = await columnService_1.ColumnService.createAuthorized(boardId, req.user.id, { title, position });
            await auditService_1.AuditService.append(boardId, req.user.id, "ColumnCreated", { columnId: col.id });
            (0, realtime_1.getIO)().to(`board:${boardId}`).emit("column:created", { column: col });
            return res.status(201).json(col);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async updateColumn(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            const col = await columnService_1.ColumnService.updateAuthorized(id, req.user.id, { title: req.body.title });
            await auditService_1.AuditService.append(col.board_id, req.user.id, "ColumnUpdated", { columnId: id });
            (0, realtime_1.getIO)().to(`board:${col.board_id}`).emit("column:updated", { column: col });
            return res.json(col);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async deleteColumn(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            const info = await columnService_1.ColumnService.deleteAuthorized(id, req.user.id);
            await auditService_1.AuditService.append(info.boardId, req.user.id, "ColumnDeleted", { columnId: id });
            (0, realtime_1.getIO)().to(`board:${info.boardId}`).emit("column:deleted", { columnId: id });
            return res.json({ message: "Column deleted" });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async reorderColumns(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { boardId, order } = req.body; // [{columnId, position}]
            await columnService_1.ColumnService.reorderAuthorized(boardId, req.user.id, order);
            await auditService_1.AuditService.append(boardId, req.user.id, "ColumnReordered", { order });
            (0, realtime_1.getIO)().to(`board:${boardId}`).emit("column:reordered", { order });
            return res.json({ message: "Reordered" });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.ColumnController = ColumnController;
