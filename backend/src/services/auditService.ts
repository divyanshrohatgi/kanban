import { supabase } from "../config/supabaseClient";
import { getIO } from "../utils/realtime";

export class AuditService {
  static async append(
    boardId: string,
    actorId: string | null,
    eventType:
      | "CardCreated"
      | "CardUpdated"
      | "CardMoved"
      | "CardDeleted"
      | "ColumnCreated"
      | "ColumnUpdated"
      | "ColumnDeleted"
      | "ColumnReordered"
      | "BoardCreated"
      | "BoardUpdated"
      | "BoardDeleted"
      | "BoardMemberAdded"
      | "BoardMemberRemoved",
    data: Record<string, any>
  ) {
    const auditEntry = {
      board_id: boardId,
      actor_id: actorId,
      event_type: eventType,
      data,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_logs").insert(auditEntry);
    if (error) throw error;

    // Emit real-time audit log event to all board members
    try {
      const io = getIO();
      const auditEvent = {
        boardId,
        actorId,
        eventType,
        data,
        timestamp: auditEntry.created_at,
      };
      console.log(`[AuditService] Emitting audit:log event to board:${boardId}:`, auditEvent);
      io.to(`board:${boardId}`).emit("audit:log", auditEvent);
    } catch (err) {
      console.warn("Failed to emit audit log event:", err);
    }
  }

  static async getRecentLogs(boardId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}
