-- ═══════════════════════════════════════════════════════
--  CineScore — Supabase Schema
--  Paste this entire file into the Supabase SQL Editor
--  and click Run.
-- ═══════════════════════════════════════════════════════


-- ── Tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.movies (
  id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  imdb_id     TEXT         NOT NULL UNIQUE,
  title       TEXT         NOT NULL,
  year        SMALLINT,
  genre       TEXT,
  imdb_rating NUMERIC(3,1) NOT NULL CHECK (imdb_rating BETWEEN 0 AND 10),
  rt_rating   SMALLINT     NOT NULL CHECK (rt_rating   BETWEEN 0 AND 100),
  poster_url  TEXT         NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lists (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT   NOT NULL UNIQUE,
  name        TEXT   NOT NULL,
  description TEXT,
  emoji       TEXT   DEFAULT '🎬'
);

CREATE TABLE IF NOT EXISTS public.list_movies (
  list_id   BIGINT REFERENCES public.lists(id)  ON DELETE CASCADE,
  movie_id  BIGINT REFERENCES public.movies(id) ON DELETE CASCADE,
  PRIMARY KEY (list_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_list_movies_list  ON public.list_movies(list_id);
CREATE INDEX IF NOT EXISTS idx_list_movies_movie ON public.list_movies(movie_id);


-- ── RLS ─────────────────────────────────────────────────

ALTER TABLE public.movies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_movies ENABLE ROW LEVEL SECURITY;

-- Public read-only (anon key is safe — data is not sensitive)
CREATE POLICY "public read movies"
  ON public.movies FOR SELECT TO anon USING (true);

CREATE POLICY "public read lists"
  ON public.lists FOR SELECT TO anon USING (true);

CREATE POLICY "public read list_movies"
  ON public.list_movies FOR SELECT TO anon USING (true);


-- ── RPC: get_random_movies ───────────────────────────────
-- Returns p_count random movies from a given list.
-- Called from the frontend to start a game round.

CREATE OR REPLACE FUNCTION public.get_random_movies(
  p_list_id BIGINT,
  p_count   INT DEFAULT 5
)
RETURNS SETOF public.movies
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT m.*
  FROM   public.movies      m
  JOIN   public.list_movies lm ON lm.movie_id = m.id
  WHERE  lm.list_id = p_list_id
  ORDER  BY random()
  LIMIT  p_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_random_movies(BIGINT, INT) TO anon;


-- ── Seed: initial lists ──────────────────────────────────
-- Movies are added later by running the fetch script.

INSERT INTO public.lists (slug, name, description, emoji) VALUES
  ('popular',       'Popular Movies',   'The most popular films right now',          '🔥'),
  ('top-rated',     'Top Rated',        'Highest rated films of all time',           '⭐'),
  ('90s-classics',  '90s Classics',     'Iconic films from the 1990s',               '📼'),
  ('korean-cinema', 'Korean Cinema',    'The best of Korean film',                   '🇰🇷'),
  ('superhero',     'Superhero',        'Marvel, DC and beyond',                     '🦸'),
  ('horror',        'Horror',           'The scariest films ever made',              '👻'),
  ('oscar-winners', 'Oscar Winners',    'Academy Award Best Picture winners',        '🏆'),
  ('sci-fi',        'Sci-Fi',           'Science fiction classics and modern hits',  '🚀')
ON CONFLICT (slug) DO NOTHING;
