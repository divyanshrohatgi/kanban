// src/services/notificationService.ts
import { supabase } from "../config/supabaseClient";

type ListOptions = {
  limit?: number;
  offset?: number;
  unread?: boolean;
};

export class NotificationService {
  // Low-level creator
  static async create(
    userId: string,
    type: string,
    message: string,
    opts?: { boardId?: string | null; cardId?: string | null }
  ) {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      message,
      board_id: opts?.boardId ?? null,
      card_id: opts?.cardId ?? null,
    });
    if (error) throw new Error(error.message);
  }

  // --- Compat wrappers used by other controllers ---
  static async notifyAssigned(
    userId: string,
    payload: { cardId: string; boardId: string; columnId?: string; title: string }
  ) {
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
  static async getUserNotifications(
    userId: string,
    limit?: number,
    offset?: number,
    unread?: boolean
  ) {
    return this.list(userId, { limit, offset, unread });
  }

  static async list(userId: string, opts?: ListOptions) {
    let q = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (opts?.unread) q = q.eq("is_read", false);

    if (opts?.limit && opts.limit > 0) {
      const from = Math.max(0, opts.offset ?? 0);
      const to = from + opts.limit - 1;
      q = q.range(from, to);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // --- Mutations ---
  static async markAsRead(id: string, userId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  static async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  static async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  static async deleteNotification(id: string, userId: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
}
