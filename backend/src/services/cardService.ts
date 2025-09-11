import { supabase } from "../config/supabaseClient";

export class CardService {
  static async createAuthorized(
    params: {
      boardId: string;
      columnId: string;
      title: string;
      description?: string | null;
      assigneeId?: string | null;
      labels?: string[];
      dueDate?: string | null;
      position: number;
    },
    userId: string
  ) {
    const { data, error } = await supabase
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

    if (error) throw new Error(error.message);
    return data;
  }

  static async updateAuthorized(
    cardId: string,
    userId: string,
    version: number,
    patch: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from("cards")
      .update({ ...patch })
      .eq("id", cardId)
      .eq("version", version) // optimistic lock
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("version conflict");
    return data;
  }

  static async moveAuthorized(
    cardId: string,
    userId: string,
    version: number,
    params: { toColumnId: string; toIndex: number }
  ) {
    const { data, error } = await supabase
      .from("cards")
      .update({
        column_id: params.toColumnId,
        position: params.toIndex,
      })
      .eq("id", cardId)
      .eq("version", version)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("version conflict");
    return data;
  }

  static async deleteAuthorized(cardId: string, userId: string) {
    const { data, error } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId)
      .select("board_id")
      .single();
    if (error) throw new Error(error.message);
    return { boardId: data.board_id };
  }
}
