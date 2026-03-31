-- ═══════════════════════════════════════════════════════
--  CineScore — Base game + Classics RPCs
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════

-- Base game: 1 from top-rated, 1 from popular, 3 from classics pool
CREATE OR REPLACE FUNCTION public.get_base_game_movies()
RETURNS SETOF public.movies
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH
  top_pick AS (
    SELECT m.* FROM public.movies m
    JOIN public.list_movies lm ON lm.movie_id = m.id
    JOIN public.lists l        ON l.id = lm.list_id
    WHERE l.slug = 'top-rated'
    ORDER BY random() LIMIT 1
  ),
  popular_pick AS (
    SELECT m.* FROM public.movies m
    JOIN public.list_movies lm ON lm.movie_id = m.id
    JOIN public.lists l        ON l.id = lm.list_id
    WHERE l.slug = 'popular'
      AND m.id NOT IN (SELECT id FROM top_pick)
    ORDER BY random() LIMIT 1
  ),
  classics_pool AS (
    SELECT DISTINCT ON (m.id) m.*
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
    SELECT * FROM classics_pool ORDER BY random() LIMIT 3
  )
  SELECT * FROM top_pick
  UNION ALL SELECT * FROM popular_pick
  UNION ALL SELECT * FROM classics_pick;
$$;

GRANT EXECUTE ON FUNCTION public.get_base_game_movies() TO anon;


-- Classics: random movies from any classics/hits decade list
CREATE OR REPLACE FUNCTION public.get_classics_movies(p_count INT DEFAULT 5)
RETURNS SETOF public.movies
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (m.id) m.*
    FROM   public.movies m
    JOIN   public.list_movies lm ON lm.movie_id = m.id
    JOIN   public.lists l        ON l.id = lm.list_id
    WHERE  l.slug IN (
      '50s-classics','60s-classics','70s-classics','80s-classics',
      '90s-classics','2000s-hits','2010s-hits','2020s-hits'
    )
  ) sub
  ORDER BY random()
  LIMIT p_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_classics_movies(INT) TO anon;
