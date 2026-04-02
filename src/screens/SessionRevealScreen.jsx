import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'
import ChatPanel from '../components/ChatPanel'

export default function SessionRevealScreen({
  session,
  movies,
  players,
  playerId,
  displayName,
  isHost,
  myGuess,
  onNext,          // host calls this → advance_session_round or results
  onSessionUpdate,
}) {
  const [guesses, setGuesses]   = useState([])
  const [messages, setMessages] = useState([])

  const round = session.current_round
  const movie = movies[round]
  const isLastRound = round >= 4

  // Fetch all guesses for this round
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

  const { sendChatMessage } = useSession({
    sessionId: session.id,
    playerId,
    displayName,
    onSessionUpdate: (sess) => onSessionUpdate?.(sess),
    onPlayersUpdate: () => {},
    onGuessInsert: () => {
      // Refresh guesses if a late one arrives
      supabase
        .from('session_guesses')
        .select('*')
        .eq('session_id', session.id)
        .eq('game_number', session.game_number)
        .eq('round', round)
        .order('score', { ascending: false })
        .then(({ data }) => { if (data) setGuesses(data) })
    },
    onChatMessage: (msg) => setMessages((p) => [...p, msg]),
  })

  async function handleNext() {
    await supabase.rpc('advance_session_round', {
      p_session_id: session.id,
      p_player_id:  playerId,
    })
    // onSessionUpdate will fire via Realtime UPDATE
  }

  // Build player name map
  const nameMap = Object.fromEntries(players.map((p) => [p.player_id, p.display_name]))

  // Diff pill styling
  function diffClass(error) {
    if (error === 0)    return 'text-green-400 bg-green-500/15 border-green-500/25'
    if (error <= 0.5)   return 'text-green-300 bg-green-500/10 border-green-500/20'
    if (error <= 1.5)   return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center p-4 pt-8 animate-fadeUp">
      <div className="w-full max-w-md space-y-4">

        {/* Movie info */}
        <div className="text-center">
          <p className="text-muted text-xs uppercase tracking-widest mb-1">Round {round + 1} — Actual Rating</p>
          <div className="text-5xl font-black text-[#f5c518] mb-1">{Number(movie.imdb_rating).toFixed(1)}</div>
          <p className="text-white/60 text-sm">{movie.title} ({movie.year})</p>
        </div>

        {/* Guesses table */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] text-xs text-muted uppercase tracking-wider px-4 py-2 border-b border-white/[0.05]">
            <span>Player</span>
            <span className="text-center w-16">Guess</span>
            <span className="text-right w-16">Score</span>
          </div>
          {guesses.length === 0 && (
            <div className="text-center text-muted text-sm py-6">Loading results…</div>
          )}
          {guesses.map((g, i) => {
            const error = Math.abs(Math.round(g.imdb_guess * 10) / 10 - Math.round(movie.imdb_rating * 10) / 10)
            const isMe  = g.player_id === playerId
            return (
              <div
                key={g.id}
                className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b border-white/[0.03] last:border-0 animate-fadeUp ${
                  isMe ? 'bg-accent/5' : ''
                }`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="text-yellow-400 text-xs">🥇</span>}
                  <span className={`text-sm font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
                    {nameMap[g.player_id] || g.player_id.slice(0, 8)}
                    {isMe && <span className="ml-1 text-accent text-xs">(you)</span>}
                  </span>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full border text-center w-16 ${diffClass(error)}`}>
                  {Number(g.imdb_guess).toFixed(1)}
                </div>
                <div className="text-right w-16 font-black text-sm text-white">{g.score}</div>
              </div>
            )
          })}
        </div>

        {/* Action */}
        {isHost ? (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)]
              hover:brightness-110 transition-all"
          >
            {isLastRound ? 'See Results →' : 'Next Round →'}
          </button>
        ) : (
          <div className="text-center py-4 text-muted text-sm animate-pulse">
            Waiting for host to continue…
          </div>
        )}

      </div>

      <ChatPanel messages={messages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
