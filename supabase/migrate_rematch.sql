-- ═══════════════════════════════════════════════════════
--  CineScore — Rematch support
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════

-- 1. Link a challenge to its next game
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS rematch_id TEXT REFERENCES public.challenges(id);

-- 2. REPLICA IDENTITY FULL so Realtime broadcasts UPDATE payloads with all columns
ALTER TABLE public.challenges REPLICA IDENTITY FULL;

-- 3. Allow updating rematch_id
CREATE POLICY "public update challenges"
  ON public.challenges FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);


-- ── RPC: create_or_get_rematch ───────────────────────────
-- Atomically creates a new challenge linked to p_challenge_id,
-- or returns the already-created rematch id if one exists.
-- This prevents two simultaneous Rematch presses from spawning two games.
CREATE OR REPLACE FUNCTION public.create_or_get_rematch(p_challenge_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  v_rematch_id TEXT;
  v_new_id     TEXT;
BEGIN
  -- Lock the row so concurrent callers can't both create a new challenge
  SELECT rematch_id INTO v_rematch_id
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF v_rematch_id IS NOT NULL THEN
    RETURN v_rematch_id;
  END IF;

  -- First caller: create a fresh challenge with new random movies
  SELECT public.create_challenge() INTO v_new_id;

  -- Link it to the current challenge so all other players get the same id
  UPDATE public.challenges SET rematch_id = v_new_id WHERE id = p_challenge_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_rematch(TEXT) TO anon, authenticated;
