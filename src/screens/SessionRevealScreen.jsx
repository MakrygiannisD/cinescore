import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ChatPanel from '../components/ChatPanel'

const AUTO_ADVANCE_SECS = 5
const REACTION_EMOJIS = ['👀', '😭', '🔥', '💀', '🎯', '🤯']

export default function SessionRevealScreen({
  session,
  movies,
  players,
  playerId,
  displayName,
  isHost,
  myGuess,
  chatMessages,
  sendChatMessage,
  onAdvanceRound,
  reactions = [],
  sendReaction,
}) {
  const [guesses, setGuesses]     = useState([])
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECS)
  const advancedRef               = useRef(false)

  const round       = session.current_round
  const movie       = movies[round]
  const isLastRound = round >= 4

  const myGuessObj = guesses.find((g) => g.player_id === playerId)
  const gotPerfect = myGuessObj?.score === 100

  useEffect(() => {
    supabase
      .from('session_guesses')
      .select('*')
      .eq('session_id', session.id)
      .eq('game_number', session.game_number)
      .eq('round', round)
      .order('score', { ascending: false })
      .then(({ data }) => { if (data) setGuesses(data) })
  }, [session.id, session.game_number, round])

  useEffect(() => {
    advancedRef.current = false
    setCountdown(AUTO_ADVANCE_SECS)

    let count = AUTO_ADVANCE_SECS
    const id = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(id)
        if (isHost && !advancedRef.current) {
          advancedRef.current = true
          onAdvanceRound()
        }
      }
    }, 1000)

    return () => clearInterval(id)
  }, [session.id, session.current_round, isHost, playerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const nameMap = Object.fromEntries(players.map((p) => [p.player_id, p.display_name]))

  function diffClass(error) {
    if (error === 0)   return 'text-green-400 bg-green-500/15 border-green-500/25'
    if (error <= 0.5)  return 'text-green-300 bg-green-500/10 border-green-500/20'
    if (error <= 1.5)  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center p-4 pt-8 animate-fadeUp">

      {/* Floating emoji reactions */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-30">
        {reactions.map((r) => (
          <div
            key={r.uid}
            className="absolute bottom-32 text-4xl animate-floatUp"
            style={{ left: `${r.x ?? 50}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md space-y-4">

        {/* Perfect score celebration */}
        {gotPerfect && (
          <div className="text-center animate-fadeUp">
            <div className="text-5xl mb-1" style={{ animation: 'pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)' }}>🎯</div>
            <div className="text-2xl font-black text-green-400" style={{ textShadow: '0 0 24px rgba(74,222,128,0.6)' }}>
              Perfect!
            </div>
          </div>
        )}

        {/* My streak bonus banner */}
        {myGuessObj?.streak_bonus > 0 && (
          <div className="text-center animate-scaleIn">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/15 border border-orange-500/25 rounded-full">
              <span className="text-orange-400 font-black text-sm">🔥 Streak Bonus +{myGuessObj.streak_bonus}</span>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-muted text-xs uppercase tracking-widest mb-1">Round {round + 1} of 5 — Actual Rating</p>
          <div className="text-5xl font-black text-imdb mb-1">{Number(movie.imdb_rating).toFixed(1)}</div>
          <p className="text-white/60 text-sm">{movie.title} ({movie.year})</p>
        </div>

        <div className="bg-surface border border-white/[0.05] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] text-xs text-muted uppercase tracking-wider px-4 py-2 border-b border-white/[0.05]">
            <span>Player</span>
            <span className="text-center w-16">Guess</span>
            <span className="text-right w-20">Score</span>
          </div>
          {guesses.length === 0 && (
            <div className="text-center text-muted text-sm py-6">Loading…</div>
          )}
          {guesses.map((g, i) => {
            const error = Math.abs(
              Math.round(g.imdb_guess * 10) / 10 -
              Math.round(movie.imdb_rating * 10) / 10
            )
            const isMe = g.player_id === playerId
            const total = g.score + (g.streak_bonus || 0)
            return (
              <div
                key={g.id}
                className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-white/[0.03] last:border-0 animate-fadeUp ${isMe ? 'bg-accent/5' : ''}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="text-xs">🥇</span>}
                  <span className={`text-sm font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
                    {nameMap[g.player_id] || '?'}
                    {isMe && <span className="ml-1 text-accent text-xs">(you)</span>}
                  </span>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full border text-center w-16 ${diffClass(error)}`}>
                  {Number(g.imdb_guess).toFixed(1)}
                </div>
                <div className="text-right w-20 font-black text-sm">
                  {g.score === 100 ? (
                    <span className="text-green-400" style={{ textShadow: '0 0 10px rgba(74,222,128,0.6)' }}>100 ✦</span>
                  ) : g.streak_bonus > 0 ? (
                    <span className="text-white">
                      {total}<span className="text-orange-400 font-normal text-xs ml-0.5">+{g.streak_bonus}🔥</span>
                    </span>
                  ) : (
                    <span className="text-white">{g.score}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Reaction emojis */}
        {sendReaction && (
          <div className="flex justify-center gap-3 py-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="text-2xl hover:scale-125 active:scale-110 transition-transform select-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="text-center text-muted text-sm">
          {isLastRound ? `Results in ${countdown}s…` : `Next movie in ${countdown}s…`}
        </div>

      </div>

      <ChatPanel messages={chatMessages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
