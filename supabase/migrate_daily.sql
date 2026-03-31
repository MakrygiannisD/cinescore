-- ═══════════════════════════════════════════════════════
--  CineScore — Daily quiz tables + RPCs
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════

-- ── Profiles (mirrors auth.users for leaderboard) ───────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read profiles"
  ON public.profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Daily picks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_picks (
  date      DATE PRIMARY KEY,
  movie_ids BIGINT[] NOT NULL
);

ALTER TABLE public.daily_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read daily_picks"
  ON public.daily_picks FOR SELECT TO anon, authenticated USING (true);


-- ── Daily scores ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_scores (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  scores       JSONB NOT NULL,   -- [{ imdbPts, total }, ...]
  total        INT  NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read daily_scores"
  ON public.daily_scores FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "users insert own score"
  ON public.daily_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ── RPC: get_daily_movies ────────────────────────────────
-- Returns today's 5 movies. Picks and seeds them if not yet chosen today.
CREATE OR REPLACE FUNCTION public.get_daily_movies()
RETURNS SETOF public.movies
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  today     DATE := CURRENT_DATE;
  pick_ids  BIGINT[];
BEGIN
  -- Check if today already has picks
  SELECT movie_ids INTO pick_ids
  FROM public.daily_picks
  WHERE date = today;

  -- If not, create them: 1 top-rated, 1 popular, 3 classics
  IF pick_ids IS NULL THEN
    WITH
    top_pick AS (
      SELECT m.id FROM public.movies m
      JOIN public.list_movies lm ON lm.movie_id = m.id
      JOIN public.lists l        ON l.id = lm.list_id
      WHERE l.slug = 'top-rated'
      ORDER BY random() LIMIT 1
    ),
    popular_pick AS (
      SELECT m.id FROM public.movies m
      JOIN public.list_movies lm ON lm.movie_id = m.id
      JOIN public.lists l        ON l.id = lm.list_id
      WHERE l.slug = 'popular'
        AND m.id NOT IN (SELECT id FROM top_pick)
      ORDER BY random() LIMIT 1
    ),
    classics_pool AS (
      SELECT DISTINCT ON (m.id) m.id
      FROM public.movies m
      JOIN public.list_movies lm ON lm.movie_id = m.id
      JOIN public.lists l        ON l.id = lm.list_id
      WHERE l.slug IN (
        '50s-classics','60s-classics','70s-classics','80s-classics',
        '90s-classics','2000s-hits','2010s-hits','2020s-hits'
      )
      AND m.id NOT IN (SELECT id FROM top_pick)
      AND m.id NOT IN (SELECT id FROM popular_pick)
    ),
    classics_pick AS (
      SELECT id FROM classics_pool ORDER BY random() LIMIT 3
    ),
    all_picks AS (
      SELECT id FROM top_pick
      UNION ALL SELECT id FROM popular_pick
      UNION ALL SELECT id FROM classics_pick
    )
    SELECT ARRAY_AGG(id) INTO pick_ids FROM all_picks;

    INSERT INTO public.daily_picks (date, movie_ids)
    VALUES (today, pick_ids)
    ON CONFLICT (date) DO UPDATE SET movie_ids = EXCLUDED.movie_ids;
  END IF;

  RETURN QUERY
    SELECT m.* FROM public.movies m
    WHERE m.id = ANY(pick_ids)
    ORDER BY ARRAY_POSITION(pick_ids, m.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_movies() TO anon, authenticated;


-- ── RPC: get_daily_leaderboard ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_leaderboard(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  rank          BIGINT,
  user_id       UUID,
  display_name  TEXT,
  avatar_url    TEXT,
  total         INT,
  completed_at  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY ds.total DESC, ds.completed_at ASC) AS rank,
    ds.user_id,
    p.display_name,
    p.avatar_url,
    ds.total,
    ds.completed_at
  FROM public.daily_scores ds
  JOIN public.profiles p ON p.id = ds.user_id
  WHERE ds.date = p_date
  ORDER BY ds.total DESC, ds.completed_at ASC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_leaderboard(DATE) TO anon, authenticated;
