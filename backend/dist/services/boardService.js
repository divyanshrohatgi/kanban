"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardService = void 0;
const supabaseClient_1 = require("../config/supabaseClient");
class BoardService {
    /**
     * Create a board, make the creator the owner, and optionally add extra members.
     */
    static async create(params) {
        const { data: board, error } = await supabaseClient_1.supabase
            .from("boards")
            .insert({
            title: params.title,
            description: params.description ?? null,
            owner_id: params.ownerId,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        const members = [
            { board_id: board.id, user_id: params.ownerId, role: "owner" },
            ...(params.members ?? []).map((m) => ({
                board_id: board.id,
                user_id: m.userId,
                role: m.role,
            })),
        ];
        if (members.length > 0) {
            const { error: memErr } = await supabaseClient_1.supabase.from("board_members").insert(members);
            if (memErr)
                throw new Error(memErr.message);
        }
        return board;
    }
    /**
     * List boards where the user is a member (any role).
     */
    static async listForUser(userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from("boards")
            .select("*, board_members!inner(user_id)")
            .eq("board_members.user_id", userId)
            .order("updated_at", { ascending: false });
        if (error)
            throw new Error(error.message);
        return data ?? [];
    }
    /**
     * Fetch a board only if the user is a member; returns board + membership row.
     */
    static async getByIdAuthorized(boardId, userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from("boards")
            .select("*, board_members!inner(user_id, role)")
            .eq("id", boardId)
            .eq("board_members.user_id", userId)
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    /**
     * Fetch board columns and cards for a given board id.
     */
    static async getWithColumnsAndCards(boardId) {
        const { data: columns, error: colErr } = await supabaseClient_1.supabase
            .from("columns")
            .select("*, cards(*)")
            .eq("board_id", boardId)
            .order("position", { ascending: true });
        if (colErr)
            throw new Error(colErr.message);
        // Ensure cards are sorted by position
        const normalized = (columns || []).map((c) => ({
            ...c,
            cards: Array.isArray(c.cards)
                ? [...c.cards].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                : [],
        }));
        return { columns: normalized };
    }
    /**
     * Update title/description if actor is owner or editor.
     */
    static async updateAuthorized(boardId, userId, patch) {
        const auth = await this.getByIdAuthorized(boardId, userId);
        const role = auth.board_members?.[0]?.role;
        if (!["owner", "editor"].includes(role))
            throw new Error("Forbidden");
        const { data, error } = await supabaseClient_1.supabase
            .from("boards")
            .update({
            title: patch.title,
            description: patch.description ?? null,
        })
            .eq("id", boardId)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    /**
     * Delete a board (only owner).
     */
    static async deleteAuthorized(boardId, userId) {
        const auth = await this.getByIdAuthorized(boardId, userId);
        const role = auth.board_members?.[0]?.role;
        if (role !== "owner")
            throw new Error("Only owner can delete board");
        const { error } = await supabaseClient_1.supabase.from("boards").delete().eq("id", boardId);
        if (error)
            throw new Error(error.message);
    }
    /**
     * Add a member (only owner).
     */
    static async addMemberAuthorized(boardId, actorId, m) {
        const auth = await this.getByIdAuthorized(boardId, actorId);
        const role = auth.board_members?.[0]?.role;
        if (role !== "owner")
            throw new Error("Only owner can add members");
        const { data, error } = await supabaseClient_1.supabase
            .from("board_members")
            .insert({ board_id: boardId, user_id: m.userId, role: m.role })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    /**
     * Remove a member (only owner).
     */
    static async removeMemberAuthorized(boardId, actorId, userId) {
        const auth = await this.getByIdAuthorized(boardId, actorId);
        const role = auth.board_members?.[0]?.role;
        if (role !== "owner")
            throw new Error("Only owner can remove members");
        const { error } = await supabaseClient_1.supabase
            .from("board_members")
            .delete()
            .eq("board_id", boardId)
            .eq("user_id", userId);
        if (error)
            throw new Error(error.message);
    }
}
exports.BoardService = BoardService;
