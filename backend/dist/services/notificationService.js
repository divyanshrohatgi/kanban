"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
// src/services/notificationService.ts
const supabaseClient_1 = require("../config/supabaseClient");
class NotificationService {
    // Low-level creator
    static async create(userId, type, message, opts) {
        const { error } = await supabaseClient_1.supabase.from("notifications").insert({
            user_id: userId,
            type,
            message,
            board_id: opts?.boardId ?? null,
            card_id: opts?.cardId ?? null,
        });
        if (error)
            throw new Error(error.message);
    }
    // --- Compat wrappers used by other controllers ---
    static async notifyAssigned(userId, payload) {
        // columnId is optional & ignored at DB level; kept for controller compatibility
        const msg = `You were assigned to "${payload.title}"`;
        await this.create(userId, "ASSIGNED", msg, {
            boardId: payload.boardId,
            cardId: payload.cardId,
        });
    }
    // (Optional) you can add more wrappers if needed later:
    // static async notifyMention(userId: string, payload: { boardId: string; cardId?: string; text: string }) { ... }
    // static async notifyBoardChange(...) { ... }
    // --- Query APIs ---
    static async getUserNotifications(userId, limit, offset, unread) {
        return this.list(userId, { limit, offset, unread });
    }
    static async list(userId, opts) {
        let q = supabaseClient_1.supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        if (opts?.unread)
            q = q.eq("is_read", false);
        if (opts?.limit && opts.limit > 0) {
            const from = Math.max(0, opts.offset ?? 0);
            const to = from + opts.limit - 1;
            q = q.range(from, to);
        }
        const { data, error } = await q;
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
    // --- Mutations ---
    static async markAsRead(id, userId) {
        const { error } = await supabaseClient_1.supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", userId);
        if (error)
            throw new Error(error.message);
    }
    static async markAllAsRead(userId) {
        const { error } = await supabaseClient_1.supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId);
        if (error)
            throw new Error(error.message);
    }
    static async getUnreadCount(userId) {
        const { count, error } = await supabaseClient_1.supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false);
        if (error)
            throw new Error(error.message);
        return count ?? 0;
    }
    static async deleteNotification(id, userId) {
        const { error } = await supabaseClient_1.supabase
            .from("notifications")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);
        if (error)
            throw new Error(error.message);
    }
}
exports.NotificationService = NotificationService;
