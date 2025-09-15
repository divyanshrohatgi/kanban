// backend/src/types/database.ts

export type UUID = string;
export type IsoDateTimeString = string;

/* ================= Profiles ================= */
export interface Profile {
  id: UUID;                       // public.profiles.id
  username: string;
  email: string;
  password_hash?: string;         // optional if you never read it from API
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/* ================ Kanban ==================== */
export type BoardRole = "owner" | "editor" | "viewer";

export interface Board {
  id: UUID;
  owner_id: UUID;                 // FK → profiles.id
  title: string;
  description: string | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface BoardMember {
  board_id: UUID;                 // FK → boards.id
  user_id: UUID;                  // FK → profiles.id
  role: BoardRole;
  created_at: IsoDateTimeString;
}

export interface Column {
  id: UUID;
  board_id: UUID;                 // FK → boards.id
  title: string;
  position: number;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface Card {
  id: UUID;
  board_id: UUID;                 // FK → boards.id
  column_id: UUID;                // FK → columns.id
  title: string;
  description: string | null;
  assignee_id: UUID | null;       // FK → profiles.id
  labels: string[] | null;
  due_date: IsoDateTimeString | null;
  position: number;
  version: number;                // optimistic concurrency
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/* ============== Audit Logs ================== */
export type AuditEventType =
  | "CardCreated"
  | "CardUpdated"
  | "CardMoved"
  | "CardDeleted"
  | "ColumnCreated"
  | "ColumnReordered"
  | "BoardUpdated";

export interface AuditLog {
  id: UUID;
  board_id: UUID;                 // FK → boards.id
  actor_id: UUID | null;          // FK → profiles.id
  event_type: AuditEventType;
  data: any;                      // JSONB payload
  created_at: IsoDateTimeString;
}

/* ============== Notifications =============== */
// Match public.notifications in your SQL (no auction fields)
export type NotificationType =
  | "card_assigned"
  | "card_moved"
  | "comment_added"
  | "due_soon"
  | "generic";

export interface Notification {
  id: UUID;
  user_id: UUID;                  // FK → profiles.id
  type: NotificationType;
  message: string;
  board_id: UUID | null;          // FK → boards.id
  card_id: UUID | null;           // FK → cards.id
  is_read: boolean;
  created_at: IsoDateTimeString;
}
