-- =========================
-- 1) Extensions
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- 2) DROP legacy (auction) objects
-- =========================

-- Drop auction triggers & functions if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_auction_on_bid') THEN
    DROP FUNCTION public.update_auction_on_bid() CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_auction_on_bid_trigger') THEN
    DROP TRIGGER update_auction_on_bid_trigger ON public.bids;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'place_bid') THEN
    DROP FUNCTION public.place_bid(UUID, UUID, DECIMAL) CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_counter_offer') THEN
    DROP FUNCTION public.create_counter_offer(UUID, UUID, UUID, DECIMAL) CASCADE;
  END IF;
END $$;

-- Drop auction-related tables if present (orders matter due to FKs)
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.counter_offers CASCADE;
DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.auctions CASCADE;

-- =========================
-- 3) Core users table (keep)
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- 4) Kanban schema
-- =========================

-- Boards
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board members (roles)
CREATE TABLE IF NOT EXISTS public.board_members (
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Columns
CREATE TABLE IF NOT EXISTS public.columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  labels TEXT[],
  due_date TIMESTAMPTZ,
  position INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (Kanban-specific; no auction references)
DROP TABLE IF EXISTS public.notifications;
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- 5) Indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

CREATE INDEX IF NOT EXISTS idx_columns_board_position ON public.columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_board_column_position ON public.cards(board_id, column_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_assignee ON public.cards(assignee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_board_created ON public.audit_logs(board_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- =========================
-- 6) Triggers: updated_at and optimistic version
-- =========================

-- Generic updated_at trigger fn (shared)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to tables that have updated_at
DROP TRIGGER IF EXISTS trg_touch_profiles ON public.profiles;
CREATE TRIGGER trg_touch_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_boards ON public.boards;
CREATE TRIGGER trg_touch_boards BEFORE UPDATE ON public.boards
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_columns ON public.columns;
CREATE TRIGGER trg_touch_columns BEFORE UPDATE ON public.columns
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_cards ON public.cards;
CREATE TRIGGER trg_touch_cards BEFORE UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bump card.version on every UPDATE (optimistic concurrency)
CREATE OR REPLACE FUNCTION public.bump_card_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_card_version ON public.cards;
CREATE TRIGGER trg_bump_card_version BEFORE UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.bump_card_version();

-- =========================
-- 7) Optional: RPC helpers for atomic updates (if you want to use supabase.rpc)
-- =========================

-- Update card with version guard (returns updated row or NULL if conflict)
CREATE OR REPLACE FUNCTION public.update_card_with_version(
  p_id UUID,
  p_version INTEGER,
  p_patch JSONB
)
RETURNS SETOF public.cards
LANGUAGE plpgsql
AS $$
DECLARE
  _row public.cards;
BEGIN
  UPDATE public.cards
  SET
    title = COALESCE((p_patch->>'title')::text, title),
    description = COALESCE((p_patch->>'description')::text, description),
    assignee_id = COALESCE((p_patch->>'assignee_id')::uuid, assignee_id),
    labels = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_patch->'labels')), labels),
    due_date = COALESCE((p_patch->>'due_date')::timestamptz, due_date)
  WHERE id = p_id AND version = p_version
  RETURNING * INTO _row;

  IF NOT FOUND THEN
    RETURN; -- returns 0 rows -> client treats as version conflict
  END IF;

  RETURN NEXT _row;
END;
$$;

-- Atomically move a card to another column + position (you can enhance with reindexing logic)
CREATE OR REPLACE FUNCTION public.move_card_atomic(
  p_card_id UUID,
  p_version INTEGER,
  p_to_column_id UUID,
  p_to_index INTEGER
)
RETURNS SETOF public.cards
LANGUAGE plpgsql
AS $$
DECLARE
  _moved public.cards;
BEGIN
  UPDATE public.cards
  SET column_id = p_to_column_id,
      position = p_to_index
  WHERE id = p_card_id AND version = p_version
  RETURNING * INTO _moved;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version conflict';
  END IF;

  RETURN NEXT _moved;
END;
$$;

-- =========================
-- 8) Row Level Security (disabled for server-side service role)
-- =========================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
