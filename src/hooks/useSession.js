import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSession({
  sessionId,
  playerId,
  displayName,
  onSessionUpdate,
  onPlayersUpdate,
  onGuessInsert,
  onChatMessage,
}) {
  const channelRef = useRef(null)

  // Stable refs — callbacks update without re-subscribing
  const cbSession = useRef(onSessionUpdate)
  const cbPlayers = useRef(onPlayersUpdate)
  const cbGuess   = useRef(onGuessInsert)
  const cbChat    = useRef(onChatMessage)

  useEffect(() => { cbSession.current = onSessionUpdate }, [onSessionUpdate])
  useEffect(() => { cbPlayers.current = onPlayersUpdate }, [onPlayersUpdate])
  useEffect(() => { cbGuess.current   = onGuessInsert   }, [onGuessInsert])
  useEffect(() => { cbChat.current    = onChatMessage   }, [onChatMessage])

  // Helper: fetch latest player list and push to callback
  function refetchPlayers(sid) {
    supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sid)
      .order('joined_at')
      .then(({ data }) => { if (data) cbPlayers.current?.(data) })
  }

  useEffect(() => {
    if (!sessionId || !playerId) return

    // Initial fetch so the host sees the current list immediately on mount
    refetchPlayers(sessionId)

    const channel = supabase.channel(`session:${sessionId}`)

    // ── Postgres Changes: sessions row ───────────────────
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
      (payload) => cbSession.current?.(payload.new)
    )

    // ── Postgres Changes: session_players ────────────────
    // Any INSERT/UPDATE/DELETE on session_players refetches the full list
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
      () => refetchPlayers(sessionId)
    )

    // ── Postgres Changes: session_guesses ────────────────
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'session_guesses', filter: `session_id=eq.${sessionId}` },
      (payload) => cbGuess.current?.(payload.new)
    )

    // ── Broadcast: chat ───────────────────────────────────
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      cbChat.current?.(payload)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId, playerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendChatMessage = useCallback(async (body) => {
    if (!channelRef.current || !sessionId || !playerId) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: { player_id: playerId, display_name: displayName, body, created_at: new Date().toISOString() },
    })

    await supabase.rpc('send_session_message', {
      p_session_id:   sessionId,
      p_player_id:    playerId,
      p_display_name: displayName,
      p_body:         body,
    })
  }, [sessionId, playerId, displayName])

  return { sendChatMessage }
}
