"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnService = void 0;
const supabaseClient_1 = require("../config/supabaseClient");
class ColumnService {
    static async createAuthorized(boardId, userId, params) {
        // TODO: check board membership
        const { data, error } = await supabaseClient_1.supabase
            .from("columns")
            .insert({
            board_id: boardId,
            title: params.title,
            position: params.position,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    static async updateAuthorized(columnId, userId, patch) {
        // TODO: check membership
        const { data, error } = await supabaseClient_1.supabase
            .from("columns")
            .update({ title: patch.title })
            .eq("id", columnId)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    static async deleteAuthorized(columnId, userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from("columns")
            .delete()
            .eq("id", columnId)
            .select("board_id")
            .single();
        if (error)
            throw new Error(error.message);
        return { boardId: data.board_id };
    }
    static async reorderAuthorized(boardId, userId, order) {
        const updates = order.map((o) => ({ id: o.columnId, position: o.position }));
        for (const u of updates) {
            const { error } = await supabaseClient_1.supabase
                .from("columns")
                .update({ position: u.position })
                .eq("id", u.id);
            if (error)
                throw new Error(error.message);
        }
        return true;
    }
}
exports.ColumnService = ColumnService;
