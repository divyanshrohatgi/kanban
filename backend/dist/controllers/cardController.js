"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardController = void 0;
const cardService_1 = require("../services/cardService");
const notificationService_1 = require("../services/notificationService");
const auditService_1 = require("../services/auditService");
const realtime_1 = require("../utils/realtime");
class CardController {
    static async createCard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const card = await cardService_1.CardService.createAuthorized({
                boardId: req.body.boardId,
                columnId: req.body.columnId,
                title: req.body.title,
                description: req.body.description ?? null,
                assigneeId: req.body.assigneeId ?? null,
                labels: req.body.labels ?? [],
                dueDate: req.body.dueDate ?? null,
                position: req.body.position,
            }, req.user.id);
            await auditService_1.AuditService.append(card.board_id, req.user.id, "CardCreated", { cardId: card.id });
            (0, realtime_1.getIO)().to(`board:${card.board_id}`).emit("card:created", { card });
            // Optional: notify assignee
            if (card.assignee_id) {
                try {
                    await notificationService_1.NotificationService.notifyAssigned(card.assignee_id, {
                        cardId: card.id,
                        boardId: card.board_id,
                        columnId: card.column_id,
                        title: card.title,
                    });
                }
                catch {
                    /* ignore notification errors */
                }
            }
            return res.status(201).json(card);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    static async updateCard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            const { version, ...patch } = req.body; // optimistic lock
            const card = await cardService_1.CardService.updateAuthorized(id, req.user.id, version, patch);
            await auditService_1.AuditService.append(card.board_id, req.user.id, "CardUpdated", { cardId: id, patch });
            (0, realtime_1.getIO)().to(`board:${card.board_id}`).emit("card:updated", { card });
            return res.json(card);
        }
        catch (err) {
            if (String(err.message || "").includes("version conflict")) {
                return res.status(409).json({ error: "Version conflict. Fetch latest card and retry." });
            }
            return res.status(400).json({ error: err.message });
        }
    }
    static async moveCard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { cardId } = req.params;
            const { toColumnId, toIndex, version } = req.body;
            const card = await cardService_1.CardService.moveAuthorized(cardId, req.user.id, version, {
                toColumnId,
                toIndex,
            });
            await auditService_1.AuditService.append(card.board_id, req.user.id, "CardMoved", {
                cardId,
                toColumnId,
                toIndex,
            });
            (0, realtime_1.getIO)().to(`board:${card.board_id}`).emit("card:moved", { cardId, toColumnId, toIndex });
            return res.json(card);
        }
        catch (err) {
            if (String(err.message || "").includes("version conflict")) {
                return res.status(409).json({ error: "Version conflict. Fetch latest card and retry." });
            }
            return res.status(400).json({ error: err.message });
        }
    }
    static async deleteCard(req, res) {
        try {
            if (!req.user)
                return res.status(401).json({ error: "Authentication required" });
            const { id } = req.params;
            const info = await cardService_1.CardService.deleteAuthorized(id, req.user.id);
            await auditService_1.AuditService.append(info.boardId, req.user.id, "CardDeleted", { cardId: id });
            (0, realtime_1.getIO)().to(`board:${info.boardId}`).emit("card:deleted", { cardId: id });
            return res.json({ message: "Card deleted" });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.CardController = CardController;
