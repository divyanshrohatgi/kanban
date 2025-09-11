import { supabase } from "../config/supabaseClient";

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
    const { error } = await supabase.from("audit_logs").insert({
      board_id: boardId,
      actor_id: actorId,
      event_type: eventType,
      data,
    });
    if (error) throw error;
  }
}
