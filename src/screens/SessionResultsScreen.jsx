import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PlayerList from '../components/PlayerList'
import ChatPanel from '../components/ChatPanel'
import { getGrade, gradeColor } from '../lib/scoring'

export default function SessionResultsScreen({
  session,
  movies,
  players,
  playerId,
  displayName,
  isHost,
  chatMessages,
  sendChatMessage,
  onKick,
  onHome,
}) {
  const [guesses, setGuesses]   = useState([])
  const [isReady, setIsReady]   = useState(false)
  const [allReady, setAllReady] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    supabase
      .from('session_guesses')
      .select('*')
      .eq('session_id', session.id)
      .eq('game_number', session.game_number)
      .then(({ data }) => { if (data) setGuesses(data) })
  }, [session.id, session.game_number])

  // Watch ready state from players prop (kept live by App-level Realtime)
  useEffect(() => {
    if (players.length === 0) return
    setAllReady(players.every((p) => p.is_ready))
  }, [players])

  // Build per-player totals for this game
  const totals = {}
  guesses.forEach((g) => { totals[g.player_id] = (totals[g.player_id] ?? 0) + g.score })

  const ranked = [...players]
    .map((p) => ({ ...p, total: totals[p.player_id] ?? 0 }))
    .sort((a, b) => b.total - a.total)

  const myTotal = totals[playerId] ?? 0
  const grade   = getGrade(myTotal, 500)
  const color   = gradeColor(myTotal, 500)

  async function handleReady() {
    const next = !isReady
    setIsReady(next)
    await supabase.rpc('set_player_ready', {
      p_session_id: session.id,
      p_player_id:  playerId,
      p_ready:      next,
    })
  }

  async function handleStartNext() {
    setStarting(true)
    await supabase.rpc('start_session_game', {
      p_session_id: session.id,
      p_player_id:  playerId,
    })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center p-4 pt-8 animate-fadeUp">
      <div className="w-full max-w-md space-y-4">

        {/* My score */}
        <div className="text-center">
          <div className="text-6xl font-black mb-1" style={{ color, textShadow: `0 0 30px ${color}60` }}>
            {myTotal}
          </div>
          <div className="text-white/60 text-sm">{grade.label}</div>
          <div className="text-muted text-xs mt-0.5">{grade.sub}</div>
        </div>

        {/* Leaderboard */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider">
            Game {session.game_number} Results
          </div>
          {ranked.map((p, i) => {
            const isMe = p.player_id === playerId
            return (
              <div
                key={p.player_id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 animate-fadeUp ${isMe ? 'bg-accent/5' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="text-muted text-sm w-5 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className={`flex-1 text-sm font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
                  {p.display_name}
                  {isMe && <span className="ml-1 text-accent text-xs">(you)</span>}
                </span>
                {/* Per-round scores */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, r) => {
                    const g = guesses.find((x) => x.player_id === p.player_id && x.round === r)
                    return <span key={r} className="text-xs text-muted w-6 text-center">{g ? g.score : '–'}</span>
                  })}
                </div>
                <span className="font-black text-sm text-white w-10 text-right">{p.total}</span>
              </div>
            )
          })}
        </div>

        {/* Movie breakdown */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.05] text-xs text-muted uppercase tracking-wider">
            Movie Breakdown
          </div>
          {movies.map((movie, r) => {
            const roundGuesses = guesses.filter((g) => g.round === r)
            return (
              <div key={r} className="border-b border-white/[0.03] last:border-0">
                {/* Movie header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {movie.title}
                    </div>
                    <div className="text-xs text-muted">{movie.year}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-[#f5c518] font-black text-lg leading-none">
                      {Number(movie.imdb_rating).toFixed(1)}
                    </div>
                    <div className="text-xs text-muted">actual</div>
                  </div>
                </div>
                {/* Player guesses for this round */}
                {roundGuesses.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {ranked.map((p) => {
                      const g = roundGuesses.find((x) => x.player_id === p.player_id)
                      if (!g) return null
                      const isMe = p.player_id === playerId
                      const error = Math.abs(
                        Math.round(g.imdb_guess * 10) / 10 -
                        Math.round(movie.imdb_rating * 10) / 10
                      )
                      const chipColor =
                        error === 0   ? 'text-green-400 bg-green-500/15 border-green-500/25' :
                        error <= 0.5  ? 'text-green-300 bg-green-500/10 border-green-500/15' :
                        error <= 1.5  ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                                        'text-red-400 bg-red-500/10 border-red-500/20'
                      return (
                        <div key={p.player_id} className="flex flex-col items-center gap-0.5">
                          <div className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${chipColor} ${isMe ? 'ring-1 ring-accent/40' : ''}`}>
                            {Number(g.imdb_guess).toFixed(1)}
                          </div>
                          <span className="text-[10px] text-muted truncate max-w-[48px] text-center">
                            {p.display_name.split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Ready voting */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Play Again?</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {players.map((p) => {
              const isMe = p.player_id === playerId
              const canKick = isHost && onKick && !isMe && p.player_id !== session.host_player_id
              return (
                <div key={p.player_id} className="flex flex-col items-center gap-1 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                    p.is_ready
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : 'bg-white/5 border-white/10 text-muted'
                  }`}>
                    {p.is_ready ? '✓' : '?'}
                  </div>
                  <span className="text-xs text-muted truncate max-w-[56px] text-center">
                    {p.display_name.split(' ')[0]}
                  </span>
                  {canKick && (
                    <button
                      onClick={() => onKick(p.player_id)}
                      className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-surface border border-white/10 text-white/20 hover:text-red-400 hover:border-red-500/30 transition-all text-[9px] leading-none"
                      title={`Kick ${p.display_name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button
            onClick={handleReady}
            className={`w-full py-3 rounded-xl font-semibold text-sm border transition-all ${
              isReady
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-accent/15 text-accent border-accent/25 hover:bg-accent/25'
            }`}
          >
            {isReady ? '✓ Ready!' : 'Ready for Next Game'}
          </button>
        </div>

        {isHost && (
          <button
            onClick={handleStartNext}
            disabled={!allReady || starting}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)] hover:brightness-110
              disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {starting ? 'Starting…' : allReady ? 'Start Next Game →' : 'Waiting for everyone…'}
          </button>
        )}

        <button onClick={onHome} className="w-full py-3 text-muted text-sm hover:text-white/70 transition-colors">
          ← Leave Session
        </button>

      </div>

      <ChatPanel messages={chatMessages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
