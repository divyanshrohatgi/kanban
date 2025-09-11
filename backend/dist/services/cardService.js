"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardService = void 0;
const supabaseClient_1 = require("../config/supabaseClient");
class CardService {
    static async createAuthorized(params, userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from("cards")
            .insert({
            board_id: params.boardId,
            column_id: params.columnId,
            title: params.title,
            description: params.description ?? null,
            assignee_id: params.assigneeId ?? null,
            labels: params.labels ?? [],
            due_date: params.dueDate ?? null,
            position: params.position,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    static async updateAuthorized(cardId, userId, version, patch) {
        const { data, error } = await supabaseClient_1.supabase
            .from("cards")
            .update({ ...patch })
            .eq("id", cardId)
            .eq("version", version) // optimistic lock
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        if (!data)
            throw new Error("version conflict");
        return data;
    }
    static async moveAuthorized(cardId, userId, version, params) {
        const { data, error } = await supabaseClient_1.supabase
            .from("cards")
            .update({
            column_id: params.toColumnId,
            position: params.toIndex,
        })
            .eq("id", cardId)
            .eq("version", version)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        if (!data)
            throw new Error("version conflict");
        return data;
    }
    static async deleteAuthorized(cardId, userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from("cards")
            .delete()
            .eq("id", cardId)
            .select("board_id")
            .single();
        if (error)
            throw new Error(error.message);
        return { boardId: data.board_id };
    }
}
exports.CardService = CardService;
