-- ═══════════════════════════════════════════════════════
--  CineScore — Enable Realtime for session tables
--  Run this AFTER migrate_sessions.sql
-- ═══════════════════════════════════════════════════════

-- Add tables to the Supabase Realtime publication so that
-- Postgres Changes events are broadcast to subscribers.
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_guesses;
