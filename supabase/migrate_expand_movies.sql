-- ═══════════════════════════════════════════════════════
--  CineScore — Clear + Expand movies table
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════

-- Clear all movie data (list definitions stay intact)
TRUNCATE public.list_movies, public.movies;

-- Add all new columns (IF NOT EXISTS makes this safe to re-run)
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS rt_rating    SMALLINT,
  ADD COLUMN IF NOT EXISTS plot         TEXT,
  ADD COLUMN IF NOT EXISTS director     TEXT,
  ADD COLUMN IF NOT EXISTS writer       TEXT,
  ADD COLUMN IF NOT EXISTS actors       TEXT,
  ADD COLUMN IF NOT EXISTS awards       TEXT,
  ADD COLUMN IF NOT EXISTS runtime      SMALLINT,
  ADD COLUMN IF NOT EXISTS rated        TEXT,
  ADD COLUMN IF NOT EXISTS released     TEXT,
  ADD COLUMN IF NOT EXISTS language     TEXT,
  ADD COLUMN IF NOT EXISTS country      TEXT,
  ADD COLUMN IF NOT EXISTS metascore    SMALLINT,
  ADD COLUMN IF NOT EXISTS imdb_votes   INT,
  ADD COLUMN IF NOT EXISTS box_office   TEXT,
  ADD COLUMN IF NOT EXISTS production   TEXT,
  ADD COLUMN IF NOT EXISTS origin_list  TEXT,
  ADD COLUMN IF NOT EXISTS omdb_raw     JSONB;
