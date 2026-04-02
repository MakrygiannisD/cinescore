import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'
import PlayerList from '../components/PlayerList'
import ChatPanel from '../components/ChatPanel'
import { getGrade, gradeColor } from '../lib/scoring'

export default function SessionResultsScreen({
  session,
  movies,
  players: initialPlayers,
  playerId,
  displayName,
  isHost,
  onNewGame,   // host pressed Start Next Game after all ready
  onHome,
  onSessionUpdate,
}) {
  const [players, setPlayers]   = useState(initialPlayers || [])
  const [guesses, setGuesses]   = useState([])
  const [messages, setMessages] = useState([])
  const [isReady, setIsReady]   = useState(false)
  const [allReady, setAllReady] = useState(false)
  const [starting, setStarting] = useState(false)

  // Fetch all guesses for current game
  useEffect(() => {
    supabase
      .from('session_guesses')
      .select('*')
      .eq('session_id', session.id)
      .eq('game_number', session.game_number)
      .then(({ data }) => { if (data) setGuesses(data) })
  }, [session.id, session.game_number])

  const { sendChatMessage } = useSession({
    sessionId: session.id,
    playerId,
    displayName,
    onSessionUpdate: (sess) => {
      if (sess.status === 'playing') onNewGame?.(sess)
      onSessionUpdate?.(sess)
    },
    onPlayersUpdate: (data) => {
      if (Array.isArray(data)) setPlayers(data)
    },
    onGuessInsert: () => {},
    onChatMessage: (msg) => setMessages((p) => [...p, msg]),
  })

  // Build per-player totals
  const totals = {}
  guesses.forEach((g) => {
    if (!totals[g.player_id]) totals[g.player_id] = 0
    totals[g.player_id] += g.score
  })

  const ranked = [...players]
    .map((p) => ({ ...p, total: totals[p.player_id] ?? 0 }))
    .sort((a, b) => b.total - a.total)

  const myTotal = totals[playerId] ?? 0
  const grade   = getGrade(myTotal, 500)
  const color   = gradeColor(myTotal, 500)

  async function handleReady() {
    const newReady = !isReady
    setIsReady(newReady)
    const { data } = await supabase.rpc('set_player_ready', {
      p_session_id: session.id,
      p_player_id:  playerId,
      p_ready:      newReady,
    })
    if (data?.all_ready) setAllReady(true)
  }

  async function handleStartNext() {
    setStarting(true)
    await supabase.rpc('start_session_game', {
      p_session_id: session.id,
      p_player_id:  playerId,
    })
    // onNewGame fires via Realtime
  }

  // Watch players for ready state changes
  useEffect(() => {
    const all = players.length > 0 && players.every((p) => p.is_ready)
    setAllReady(all)
  }, [players])

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center p-4 pt-8 animate-fadeUp">
      <div className="w-full max-w-md space-y-4">

        {/* My score */}
        <div className="text-center">
          <div
            className="text-6xl font-black mb-1"
            style={{ color, textShadow: `0 0 30px ${color}60` }}
          >
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
                className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 animate-fadeUp ${
                  isMe ? 'bg-accent/5' : ''
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="text-muted text-sm w-5 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className={`flex-1 text-sm font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
                  {p.display_name}
                  {isMe && <span className="ml-1 text-accent text-xs">(you)</span>}
                </span>
                {/* Per-round mini scores */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, r) => {
                    const g = guesses.find((x) => x.player_id === p.player_id && x.round === r)
                    return (
                      <span key={r} className="text-xs text-muted w-6 text-center">
                        {g ? g.score : '–'}
                      </span>
                    )
                  })}
                </div>
                <span className="font-black text-sm text-white w-10 text-right">{p.total}</span>
              </div>
            )
          })}
        </div>

        {/* Ready voting */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Play Again?</p>
          <div className="flex gap-2 mb-4">
            {players.map((p) => (
              <div key={p.player_id} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  p.is_ready
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : 'bg-white/5 border-white/10 text-muted'
                }`}>
                  {p.is_ready ? '✓' : '?'}
                </div>
                <span className="text-xs text-muted truncate max-w-[60px] text-center">
                  {p.display_name.split(' ')[0]}
                </span>
              </div>
            ))}
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

        {/* Host start next game */}
        {isHost && (
          <button
            onClick={handleStartNext}
            disabled={!allReady || starting}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)]
              hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all"
          >
            {starting ? 'Starting…' : allReady ? 'Start Next Game →' : 'Waiting for everyone…'}
          </button>
        )}

        <button
          onClick={onHome}
          className="w-full py-3 text-muted text-sm hover:text-white/70 transition-colors"
        >
          ← Leave Session
        </button>

      </div>

      <ChatPanel messages={messages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
