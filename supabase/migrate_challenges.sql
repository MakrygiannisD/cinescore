-- ═══════════════════════════════════════════════════════
--  CineScore — Challenge (async 1v1) tables + RPCs
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════

-- ── Challenges ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id          TEXT PRIMARY KEY,          -- short random id e.g. "abc12"
  movie_ids   BIGINT[] NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read challenges"
  ON public.challenges FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public insert challenges"
  ON public.challenges FOR INSERT TO anon, authenticated WITH CHECK (true);


-- ── Challenge scores ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_scores (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  challenge_id  TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  scores        JSONB NOT NULL,
  total         INT  NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenge_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read challenge_scores"
  ON public.challenge_scores FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public insert challenge_scores"
  ON public.challenge_scores FOR INSERT TO anon, authenticated WITH CHECK (true);


-- ── RPC: create_challenge ────────────────────────────────
-- Creates a challenge with 5 random movies (same mix as base game).
-- Returns the challenge id.
CREATE OR REPLACE FUNCTION public.create_challenge()
RETURNS TEXT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  new_id    TEXT;
  pick_ids  BIGINT[];
BEGIN
  -- Generate a random 6-char alphanumeric id
  new_id := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));

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

  INSERT INTO public.challenges (id, movie_ids)
  VALUES (new_id, pick_ids);

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_challenge() TO anon, authenticated;


-- ── RPC: get_challenge_movies ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_challenge_movies(p_id TEXT)
RETURNS SETOF public.movies
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT m.*
  FROM public.movies m
  JOIN public.challenges c ON m.id = ANY(c.movie_ids)
  WHERE c.id = p_id
  ORDER BY ARRAY_POSITION(c.movie_ids, m.id);
$$;

GRANT EXECUTE ON FUNCTION public.get_challenge_movies(TEXT) TO anon, authenticated;
