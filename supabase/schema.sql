-- Supabase schema for Memo
-- Run this in Supabase SQL Editor when migrating from localStorage

-- Decks
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created TIMESTAMPTZ DEFAULT now(),
  last_studied TIMESTAMPTZ
);

-- Cards
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  furigana TEXT,
  tags TEXT[],
  created TIMESTAMPTZ DEFAULT now()
);

-- Card states (spaced repetition scheduler state per card)
CREATE TABLE IF NOT EXISTS public.card_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 5,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  due TIMESTAMPTZ DEFAULT now(),
  last_review TIMESTAMPTZ,
  suspended BOOLEAN DEFAULT FALSE,
  UNIQUE(card_id)
);

-- Review logs
CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT CHECK (rating IN ('again','hard','good','easy','auto')),
  result TEXT CHECK (result IN ('correct','incorrect')),
  streak_after INTEGER,
  interval_before REAL,
  interval_after REAL,
  elapsed_days REAL,
  created TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security policies
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own decks" ON public.decks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own cards" ON public.cards FOR ALL USING (EXISTS (SELECT 1 FROM public.decks d WHERE d.id = cards.deck_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can CRUD own states" ON public.card_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own logs" ON public.review_logs FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_deck ON public.cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_states_due ON public.card_states(due);
CREATE INDEX IF NOT EXISTS idx_logs_user ON public.review_logs(user_id);
