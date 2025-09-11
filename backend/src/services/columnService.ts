import { supabase } from "../config/supabaseClient";

export class ColumnService {
  static async createAuthorized(
    boardId: string,
    userId: string,
    params: { title: string; position: number }
  ) {
    // TODO: check board membership
    const { data, error } = await supabase
      .from("columns")
      .insert({
        board_id: boardId,
        title: params.title,
        position: params.position,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async updateAuthorized(columnId: string, userId: string, patch: { title: string }) {
    // TODO: check membership
    const { data, error } = await supabase
      .from("columns")
      .update({ title: patch.title })
      .eq("id", columnId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteAuthorized(columnId: string, userId: string) {
    const { data, error } = await supabase
      .from("columns")
      .delete()
      .eq("id", columnId)
      .select("board_id")
      .single();
    if (error) throw new Error(error.message);
    return { boardId: data.board_id };
  }

  static async reorderAuthorized(
    boardId: string,
    userId: string,
    order: Array<{ columnId: string; position: number }>
  ) {
    const updates = order.map((o) => ({ id: o.columnId, position: o.position }));
    for (const u of updates) {
      const { error } = await supabase
        .from("columns")
        .update({ position: u.position })
        .eq("id", u.id);
      if (error) throw new Error(error.message);
    }
    return true;
  }
}
