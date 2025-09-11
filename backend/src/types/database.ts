export type UUID = string;
export type IsoDateTimeString = string;

export type AuctionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled"
  | "sold";

export type CounterOfferStatus = "pending" | "accepted" | "rejected";

export type InvoiceStatus = "pending" | "paid" | "cancelled";

export type NotificationType =
  | "new_bid"
  | "outbid"
  | "auction_won"
  | "bid_accepted"
  | "bid_rejected"
  | "counter_offer_received"
  | "counter_offer_accepted"
  | "counter_offer_rejected";

// ================= Profiles =================
export interface Profile {
  id: UUID; // auth.users.id
  username: string;
  email: string;
  password_hash?: string;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

// ================= Auctions =================
export interface Auction {
  id: UUID;
  seller_id: UUID; // FK → profiles.id
  item_name: string;
  description: string | null;
  starting_price: number;
  current_price: number;
  bid_increment: number;
  go_live_date: IsoDateTimeString;
  end_date: IsoDateTimeString;
  status: AuctionStatus;
  highest_bidder_id: UUID | null; // FK → profiles.id
  image_url: string | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

// ================= Bids =================
export interface Bid {
  id: UUID;
  auction_id: UUID; // FK → auctions.id
  bidder_id: UUID; // FK → profiles.id
  amount: number;
  created_at: IsoDateTimeString;
}

// ================= Counter Offers =================
export interface CounterOffer {
  id: UUID;
  auction_id: UUID; // FK → auctions.id
  seller_id: UUID; // FK → profiles.id
  bidder_id: UUID; // FK → profiles.id
  proposed_price: number;
  status: CounterOfferStatus;
  expires_at: IsoDateTimeString;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

// ================= Invoices =================
export interface Invoice {
  id: UUID;
  auction_id: UUID; // FK → auctions.id
  buyer_id: UUID; // FK → profiles.id
  seller_id: UUID; // FK → profiles.id
  amount: number;
  status: InvoiceStatus;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

// ================= Notifications =================
export interface Notification {
  id: UUID;
  user_id: UUID; // FK → profiles.id
  type: NotificationType;
  message: string;
  related_auction_id: UUID | null; // FK → auctions.id
  is_read: boolean;
  created_at: IsoDateTimeString;
}

// ================= Kanban =================
export type BoardRole = "owner" | "editor" | "viewer";

export interface Board {
  id: UUID;
  owner_id: UUID;
  title: string;
  description: string | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface BoardMember {
  board_id: UUID;
  user_id: UUID;
  role: BoardRole;
  created_at: IsoDateTimeString;
}

export interface Column {
  id: UUID;
  board_id: UUID;
  title: string;
  position: number;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface Card {
  id: UUID;
  board_id: UUID;
  column_id: UUID;
  title: string;
  description: string | null;
  assignee_id: UUID | null;
  labels: string[] | null;
  due_date: IsoDateTimeString | null;
  position: number;
  version: number;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

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
  board_id: UUID;
  actor_id: UUID | null;
  event_type: AuditEventType;
  data: any;
  created_at: IsoDateTimeString;
}
