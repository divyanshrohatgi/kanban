import { supabase } from "../config/supabaseClient";

export class CardService {
  static async getByIdAuthorized(cardId: string, userId: string) {
    // First check if user has access to the board this card belongs to
    const { data: card, error } = await supabase
      .from("cards")
      .select(`
        *,
        boards!inner(
          id,
          board_members!inner(user_id)
        )
      `)
      .eq("id", cardId)
      .eq("boards.board_members.user_id", userId)
      .single();

    if (error) throw new Error(error.message);
    return card;
  }

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
    // First get the card info before deleting
    const { data: cardData, error: fetchError } = await supabase
      .from("cards")
      .select(`
        board_id,
        assignee_id,
        title,
        boards!inner(
          id,
          board_members!inner(user_id)
        )
      `)
      .eq("id", cardId)
      .eq("boards.board_members.user_id", userId)
      .single();
    
    if (fetchError) throw new Error(fetchError.message);

    // Now delete the card
    const { data, error } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId)
      .select("board_id")
      .single();
    if (error) throw new Error(error.message);
    
    return { 
      boardId: data.board_id,
      assigneeId: cardData.assignee_id,
      title: cardData.title
    };
  }
}
