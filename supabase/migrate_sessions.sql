-- ═══════════════════════════════════════════════════════
--  CineScore — Multiplayer Sessions
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════


-- ── sessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id              TEXT PRIMARY KEY,
  host_player_id  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'lobby',  -- lobby | playing | reveal | results
  movie_ids       BIGINT[],
  current_round   SMALLINT NOT NULL DEFAULT 0,    -- 0-indexed
  round_deadline  TIMESTAMPTZ,
  round_seconds   SMALLINT NOT NULL DEFAULT 30,
  game_number     SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read sessions"
  ON public.sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert sessions"
  ON public.sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update sessions"
  ON public.sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);


-- ── session_players ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_players (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id     TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  is_ready      BOOLEAN NOT NULL DEFAULT false,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, player_id)
);

ALTER TABLE public.session_players REPLICA IDENTITY FULL;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read session_players"
  ON public.session_players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert session_players"
  ON public.session_players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update session_players"
  ON public.session_players FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_session_players_session ON public.session_players(session_id);


-- ── session_guesses ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_guesses (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id     TEXT NOT NULL,
  game_number   SMALLINT NOT NULL,
  round         SMALLINT NOT NULL,
  imdb_guess    NUMERIC(3,1) NOT NULL,
  score         INT NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, player_id, game_number, round)
);

ALTER TABLE public.session_guesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read session_guesses"
  ON public.session_guesses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert session_guesses"
  ON public.session_guesses FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_session_guesses_game ON public.session_guesses(session_id, game_number);


-- ── session_messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_messages (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id     TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  body          TEXT NOT NULL CHECK (char_length(body) <= 200),
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read session_messages"
  ON public.session_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert session_messages"
  ON public.session_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_session_messages_session ON public.session_messages(session_id);


-- ═══════════════════════════════════════════════════════
--  Helper: scoring curve (mirrors src/lib/scoring.js)
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.compute_imdb_score(p_guess NUMERIC, p_actual NUMERIC)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER AS $$
DECLARE
  err  NUMERIC;
  x0   NUMERIC; y0 NUMERIC;
  x1   NUMERIC; y1 NUMERIC;
  t    NUMERIC;
  curve NUMERIC[][] := ARRAY[
    ARRAY[0.0::NUMERIC, 100::NUMERIC],
    ARRAY[0.1::NUMERIC,  92::NUMERIC],
    ARRAY[0.3::NUMERIC,  65::NUMERIC],
    ARRAY[0.9::NUMERIC,  40::NUMERIC],
    ARRAY[1.0::NUMERIC,  20::NUMERIC],
    ARRAY[2.5::NUMERIC,   0::NUMERIC]
  ];
  i INT;
BEGIN
  err := ABS(ROUND(p_guess, 1) - ROUND(p_actual, 1));
  IF err = 0 THEN RETURN 100; END IF;
  IF err >= 2.5 THEN RETURN 0; END IF;
  FOR i IN 1..5 LOOP
    x0 := curve[i][1]; y0 := curve[i][2];
    x1 := curve[i+1][1]; y1 := curve[i+1][2];
    IF err >= x0 AND err <= x1 THEN
      t := (err - x0) / (x1 - x0);
      RETURN ROUND(y0 + t * (y1 - y0));
    END IF;
  END LOOP;
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_imdb_score(NUMERIC, NUMERIC) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: create_session
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_session(
  p_display_name  TEXT,
  p_player_id     TEXT,
  p_round_seconds SMALLINT DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  new_id TEXT;
BEGIN
  new_id := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));

  INSERT INTO public.sessions (id, host_player_id, round_seconds)
  VALUES (new_id, p_player_id, p_round_seconds);

  INSERT INTO public.session_players (session_id, player_id, display_name)
  VALUES (new_id, p_player_id, p_display_name);

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_session(TEXT, TEXT, SMALLINT) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: join_session
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.join_session(
  p_session_id    TEXT,
  p_display_name  TEXT,
  p_player_id     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  sess         public.sessions%ROWTYPE;
  player_count INT;
  result       JSONB;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Allow joining in lobby or results (between games); reject during active play
  IF sess.status NOT IN ('lobby', 'results') THEN
    -- Still allow rejoin for players already in the session
    IF NOT EXISTS (
      SELECT 1 FROM public.session_players
      WHERE session_id = p_session_id AND player_id = p_player_id
    ) THEN
      RAISE EXCEPTION 'Session already started';
    END IF;
  END IF;

  -- Enforce max 8 players for new joins
  SELECT COUNT(*) INTO player_count
  FROM public.session_players WHERE session_id = p_session_id;

  IF player_count >= 8 AND NOT EXISTS (
    SELECT 1 FROM public.session_players
    WHERE session_id = p_session_id AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'Session is full (max 8 players)';
  END IF;

  -- Insert or update (rejoin)
  INSERT INTO public.session_players (session_id, player_id, display_name)
  VALUES (p_session_id, p_player_id, p_display_name)
  ON CONFLICT (session_id, player_id)
  DO UPDATE SET display_name = EXCLUDED.display_name;

  -- Return session snapshot
  SELECT jsonb_build_object(
    'session', row_to_json(s)::JSONB,
    'players', (
      SELECT jsonb_agg(row_to_json(sp)::JSONB ORDER BY sp.joined_at)
      FROM public.session_players sp WHERE sp.session_id = p_session_id
    )
  ) INTO result
  FROM public.sessions s WHERE s.id = p_session_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_session(TEXT, TEXT, TEXT) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: start_session_game
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.start_session_game(
  p_session_id  TEXT,
  p_player_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  sess      public.sessions%ROWTYPE;
  pick_ids  BIGINT[];
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id FOR UPDATE;

  IF sess.host_player_id != p_player_id THEN
    RAISE EXCEPTION 'Only the host can start the game';
  END IF;

  -- Pick 5 movies: 1 top-rated, 1 popular, 3 classics
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
  classics_pick AS (SELECT id FROM classics_pool ORDER BY random() LIMIT 3),
  all_picks AS (
    SELECT id FROM top_pick
    UNION ALL SELECT id FROM popular_pick
    UNION ALL SELECT id FROM classics_pick
  )
  SELECT ARRAY_AGG(id) INTO pick_ids FROM all_picks;

  -- Reset ready state for all players
  UPDATE public.session_players SET is_ready = false WHERE session_id = p_session_id;

  -- Start the game
  UPDATE public.sessions SET
    movie_ids      = pick_ids,
    game_number    = game_number + 1,
    current_round  = 0,
    status         = 'playing',
    round_deadline = now() + (sess.round_seconds || ' seconds')::INTERVAL
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_session_game(TEXT, TEXT) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: submit_session_guess
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.submit_session_guess(
  p_session_id  TEXT,
  p_player_id   TEXT,
  p_imdb_guess  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  sess            public.sessions%ROWTYPE;
  actual_rating   NUMERIC;
  computed_score  INT;
  submitted_count INT;
  player_count    INT;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id;

  IF sess.status != 'playing' THEN
    RAISE EXCEPTION 'Round is not active';
  END IF;

  -- Get actual IMDb rating for current movie
  SELECT imdb_rating INTO actual_rating
  FROM public.movies
  WHERE id = sess.movie_ids[sess.current_round + 1];  -- Postgres arrays are 1-indexed

  computed_score := public.compute_imdb_score(p_imdb_guess, actual_rating);

  -- Insert guess (idempotent — ignore duplicates)
  INSERT INTO public.session_guesses
    (session_id, player_id, game_number, round, imdb_guess, score)
  VALUES
    (p_session_id, p_player_id, sess.game_number, sess.current_round, p_imdb_guess, computed_score)
  ON CONFLICT (session_id, player_id, game_number, round) DO NOTHING;

  -- Count submitted vs total players
  SELECT COUNT(*) INTO submitted_count
  FROM public.session_guesses
  WHERE session_id = p_session_id
    AND game_number = sess.game_number
    AND round = sess.current_round;

  SELECT COUNT(*) INTO player_count
  FROM public.session_players WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'score', computed_score,
    'all_submitted', submitted_count >= player_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_session_guess(TEXT, TEXT, NUMERIC) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: show_session_reveal
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.show_session_reveal(
  p_session_id  TEXT,
  p_player_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  sess public.sessions%ROWTYPE;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id;

  IF sess.host_player_id != p_player_id THEN
    RAISE EXCEPTION 'Only the host can advance the round';
  END IF;

  UPDATE public.sessions SET
    status = 'reveal',
    round_deadline = NULL
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.show_session_reveal(TEXT, TEXT) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: advance_session_round
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.advance_session_round(
  p_session_id  TEXT,
  p_player_id   TEXT
)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  sess public.sessions%ROWTYPE;
BEGIN
  SELECT * INTO sess FROM public.sessions WHERE id = p_session_id FOR UPDATE;

  IF sess.host_player_id != p_player_id THEN
    RAISE EXCEPTION 'Only the host can advance the round';
  END IF;

  IF sess.current_round < 4 THEN
    UPDATE public.sessions SET
      current_round  = current_round + 1,
      status         = 'playing',
      round_deadline = now() + (sess.round_seconds || ' seconds')::INTERVAL
    WHERE id = p_session_id;
  ELSE
    UPDATE public.sessions SET
      status         = 'results',
      round_deadline = NULL
    WHERE id = p_session_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_session_round(TEXT, TEXT) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: set_player_ready
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_player_ready(
  p_session_id  TEXT,
  p_player_id   TEXT,
  p_ready       BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  ready_count  INT;
  player_count INT;
BEGIN
  UPDATE public.session_players
  SET is_ready = p_ready
  WHERE session_id = p_session_id AND player_id = p_player_id;

  SELECT COUNT(*) INTO ready_count
  FROM public.session_players WHERE session_id = p_session_id AND is_ready = true;

  SELECT COUNT(*) INTO player_count
  FROM public.session_players WHERE session_id = p_session_id;

  RETURN jsonb_build_object('all_ready', ready_count >= player_count AND player_count > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_player_ready(TEXT, TEXT, BOOLEAN) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: send_session_message
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.send_session_message(
  p_session_id    TEXT,
  p_player_id     TEXT,
  p_display_name  TEXT,
  p_body          TEXT
)
RETURNS VOID
LANGUAGE sql VOLATILE SECURITY DEFINER AS $$
  INSERT INTO public.session_messages (session_id, player_id, display_name, body)
  VALUES (p_session_id, p_player_id, p_display_name, p_body);
$$;

GRANT EXECUTE ON FUNCTION public.send_session_message(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ═══════════════════════════════════════════════════════
--  RPC: get_session_state
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_session_state(p_session_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'session', row_to_json(s)::JSONB,
    'players', (
      SELECT jsonb_agg(row_to_json(sp)::JSONB ORDER BY sp.joined_at)
      FROM public.session_players sp WHERE sp.session_id = p_session_id
    ),
    'guesses', (
      SELECT jsonb_agg(row_to_json(sg)::JSONB ORDER BY sg.submitted_at)
      FROM public.session_guesses sg
      WHERE sg.session_id = p_session_id AND sg.game_number = s.game_number
    ),
    'messages', (
      SELECT jsonb_agg(row_to_json(sm)::JSONB ORDER BY sm.created_at)
      FROM public.session_messages sm
      WHERE sm.session_id = p_session_id
      ORDER BY sm.created_at DESC
      LIMIT 50
    ),
    'movies', (
      SELECT jsonb_agg(row_to_json(m)::JSONB ORDER BY ARRAY_POSITION(s.movie_ids, m.id))
      FROM public.movies m
      WHERE m.id = ANY(s.movie_ids)
    )
  ) INTO result
  FROM public.sessions s WHERE s.id = p_session_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_state(TEXT) TO anon, authenticated;
