import { supabase } from "../config/supabaseClient";

export type BoardRole = "owner" | "editor" | "viewer";

export class BoardService {
  /**
   * Create a board, make the creator the owner, and optionally add extra members.
   */
  static async create(params: {
    title: string;
    description?: string | null;
    ownerId: string;
    members?: Array<{ userId: string; role: BoardRole }>;
  }) {
    const { data: board, error } = await supabase
      .from("boards")
      .insert({
        title: params.title,
        description: params.description ?? null,
        owner_id: params.ownerId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const members = [
      { board_id: board.id, user_id: params.ownerId, role: "owner" as BoardRole },
      ...(params.members ?? []).map((m) => ({
        board_id: board.id,
        user_id: m.userId,
        role: m.role,
      })),
    ];

    if (members.length > 0) {
      const { error: memErr } = await supabase.from("board_members").insert(members);
      if (memErr) throw new Error(memErr.message);
    }

    return board;
  }

  /**
   * List boards where the user is a member (any role).
   */
  static async listForUser(userId: string) {
    const { data, error } = await supabase
      .from("boards")
      .select("*, board_members!inner(user_id)")
      .eq("board_members.user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /**
   * Fetch a board only if the user is a member; returns board + membership row.
   */
  static async getByIdAuthorized(boardId: string, userId: string) {
    const { data, error } = await supabase
      .from("boards")
      .select("*, board_members!inner(user_id, role)")
      .eq("id", boardId)
      .eq("board_members.user_id", userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Fetch board columns and cards for a given board id.
   */
  static async getWithColumnsAndCards(boardId: string) {
    const { data: columns, error: colErr } = await supabase
      .from("columns")
      .select("*, cards(*)")
      .eq("board_id", boardId)
      .order("position", { ascending: true });
    if (colErr) throw new Error(colErr.message);

    // Ensure cards are sorted by position
    const normalized = (columns || []).map((c: any) => ({
      ...c,
      cards: Array.isArray(c.cards)
        ? [...c.cards].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        : [],
    }));

    return { columns: normalized };
  }

  /**
   * Update title/description if actor is owner or editor.
   */
  static async updateAuthorized(
    boardId: string,
    userId: string,
    patch: { title?: string; description?: string | null }
  ) {
    const auth = await this.getByIdAuthorized(boardId, userId);
    const role = (auth as any).board_members?.[0]?.role as BoardRole;
    if (!["owner", "editor"].includes(role)) throw new Error("Forbidden");

    const { data, error } = await supabase
      .from("boards")
      .update({
        title: patch.title,
        description: patch.description ?? null,
      })
      .eq("id", boardId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Delete a board (only owner).
   */
  static async deleteAuthorized(boardId: string, userId: string) {
    const auth = await this.getByIdAuthorized(boardId, userId);
    const role = (auth as any).board_members?.[0]?.role as BoardRole;
    if (role !== "owner") throw new Error("Only owner can delete board");

    const { error } = await supabase.from("boards").delete().eq("id", boardId);
    if (error) throw new Error(error.message);
  }

  /**
   * Add a member (only owner).
   */
  static async addMemberAuthorized(
    boardId: string,
    actorId: string,
    m: { userId: string; role: BoardRole }
  ) {
    const auth = await this.getByIdAuthorized(boardId, actorId);
    const role = (auth as any).board_members?.[0]?.role as BoardRole;
    if (role !== "owner") throw new Error("Only owner can add members");

    const { data, error } = await supabase
      .from("board_members")
      .insert({ board_id: boardId, user_id: m.userId, role: m.role })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Remove a member (only owner).
   */
  static async removeMemberAuthorized(boardId: string, actorId: string, userId: string) {
    const auth = await this.getByIdAuthorized(boardId, actorId);
    const role = (auth as any).board_members?.[0]?.role as BoardRole;
    if (role !== "owner") throw new Error("Only owner can remove members");

    const { error } = await supabase
      .from("board_members")
      .delete()
      .eq("board_id", boardId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
  }

  /**
   * Get all members of a board.
   */
  static async getBoardMembers(boardId: string) {
    const { data, error } = await supabase
      .from("board_members")
      .select("user_id, role")
      .eq("board_id", boardId);

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
