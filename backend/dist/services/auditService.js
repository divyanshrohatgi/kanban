"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const supabaseClient_1 = require("../config/supabaseClient");
class AuditService {
    static async append(boardId, actorId, eventType, data) {
        const { error } = await supabaseClient_1.supabase.from("audit_logs").insert({
            board_id: boardId,
            actor_id: actorId,
            event_type: eventType,
            data,
        });
        if (error)
            throw error;
    }
}
exports.AuditService = AuditService;
