import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Manages the Supabase Realtime channel for a session.
 * Handles Presence, Postgres Changes, and Broadcast (chat).
 *
 * @param {string|null} sessionId
 * @param {string|null} playerId
 * @param {string}      displayName
 * @param {function}    onSessionUpdate  - called with updated session row
 * @param {function}    onPlayersUpdate  - called with full players array
 * @param {function}    onGuessInsert    - called with new guess row
 * @param {function}    onChatMessage    - called with {player_id, display_name, body, created_at}
 */
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

  // Stable refs so callbacks don't cause re-subscriptions
  const cbSession  = useRef(onSessionUpdate)
  const cbPlayers  = useRef(onPlayersUpdate)
  const cbGuess    = useRef(onGuessInsert)
  const cbChat     = useRef(onChatMessage)

  useEffect(() => { cbSession.current  = onSessionUpdate  }, [onSessionUpdate])
  useEffect(() => { cbPlayers.current  = onPlayersUpdate  }, [onPlayersUpdate])
  useEffect(() => { cbGuess.current    = onGuessInsert    }, [onGuessInsert])
  useEffect(() => { cbChat.current     = onChatMessage    }, [onChatMessage])

  useEffect(() => {
    if (!sessionId || !playerId) return

    const channel = supabase.channel(`session:${sessionId}`, {
      config: { presence: { key: playerId } },
    })

    // ── Presence ─────────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      // Build a map of online player_ids
      const onlineIds = new Set(Object.keys(state))
      cbPlayers.current?.(onlineIds)
    })

    // ── Postgres Changes: sessions row ───────────────────
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
      (payload) => cbSession.current?.(payload.new)
    )

    // ── Postgres Changes: session_players ────────────────
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
      () => {
        // Refetch players on any change
        supabase
          .from('session_players')
          .select('*')
          .eq('session_id', sessionId)
          .order('joined_at')
          .then(({ data }) => { if (data) cbPlayers.current?.(data) })
      }
    )

    // ── Postgres Changes: session_guesses ────────────────
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'session_guesses', filter: `session_id=eq.${sessionId}` },
      (payload) => cbGuess.current?.(payload.new)
    )

    // ── Broadcast: chat messages ─────────────────────────
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      cbChat.current?.(payload)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ player_id: playerId, display_name: displayName })
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId, playerId, displayName])

  const sendChatMessage = useCallback(async (body) => {
    if (!channelRef.current || !sessionId || !playerId) return

    // Broadcast for instant delivery
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat',
      payload: { player_id: playerId, display_name: displayName, body, created_at: new Date().toISOString() },
    })

    // Persist to DB as backup
    await supabase.rpc('send_session_message', {
      p_session_id:   sessionId,
      p_player_id:    playerId,
      p_display_name: displayName,
      p_body:         body,
    })
  }, [sessionId, playerId, displayName])

  return { sendChatMessage }
}
