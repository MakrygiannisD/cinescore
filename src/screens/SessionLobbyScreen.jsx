import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PlayerList from '../components/PlayerList'
import ChatPanel from '../components/ChatPanel'

const TIMER_OPTIONS = [15, 30, 45, 60]

const GENRE_OPTIONS = [
  { value: 'all',       label: '🎬 Mix' },
  { value: 'horror',    label: '🎃 Horror' },
  { value: 'animation', label: '🎨 Animated' },
  { value: 'comedy',    label: '😂 Comedy' },
  { value: 'thriller',  label: '😰 Thriller' },
  { value: 'sci-fi',    label: '🚀 Sci-Fi' },
  { value: 'drama',     label: '🎭 Drama' },
  { value: 'action',    label: '💥 Action' },
  { value: '80s',       label: '🕹️ 80s' },
  { value: '90s',       label: '📼 90s' },
  { value: '2000s',     label: '💿 2000s' },
  { value: 'top-rated', label: '⭐ Top' },
]

export default function SessionLobbyScreen({
  sessionId,
  session,
  playerId,
  displayName,
  isHost,
  hostPlayerId,
  players,
  chatMessages,
  sendChatMessage,
  onKick,
  onHome,
}) {
  const [copied, setCopied]             = useState(false)
  const [roundSeconds, setRoundSeconds] = useState(30)
  const [genreFilter, setGenreFilter]   = useState('all')
  const [starting, setStarting]         = useState(false)

  const shareCode = sessionId.toUpperCase()

  // Sync timer choice to DB when host changes it
  useEffect(() => {
    if (!isHost) return
    supabase.from('sessions').update({ round_seconds: roundSeconds }).eq('id', sessionId).then(() => {})
  }, [roundSeconds, isHost, sessionId])

  // Sync genre filter to DB when host changes it
  useEffect(() => {
    if (!isHost) return
    supabase.from('sessions').update({ genre_filter: genreFilter }).eq('id', sessionId).then(() => {})
  }, [genreFilter, isHost, sessionId])

  // Non-host: update when session prop changes via Realtime
  useEffect(() => {
    if (!isHost && session?.genre_filter) setGenreFilter(session.genre_filter)
  }, [session?.genre_filter, isHost])

  function copyLink() {
    navigator.clipboard.writeText(shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleStart() {
    setStarting(true)
    try {
      await supabase.rpc('start_session_game', { p_session_id: sessionId, p_player_id: playerId })
    } catch (e) {
      console.error(e)
      setStarting(false)
    }
  }

  const selectedGenreLabel = GENRE_OPTIONS.find(g => g.value === genreFilter)?.label ?? '🎬 Mix'

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 animate-fadeUp">
      <div className="w-full max-w-md space-y-4">

        <div className="text-center mb-2">
          <div className="text-4xl mb-3">🎬</div>
          <h1 className="text-2xl font-black text-white">Multiplayer Session</h1>
          <p className="text-muted text-sm mt-1">
            {isHost ? 'Share the code and start when everyone is in.' : 'Waiting for the host to start…'}
          </p>
        </div>

        {/* Session code */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl p-5">
          <p className="text-muted text-xs uppercase tracking-widest mb-3 text-center">Session Code</p>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-center text-3xl font-black tracking-[0.2em] text-accent">
              {shareCode}
            </span>
            <button
              onClick={copyLink}
              className={`text-sm px-4 py-2 rounded-xl font-semibold border transition-all ${
                copied
                  ? 'bg-green-500/15 text-green-400 border-green-500/25'
                  : 'bg-accent/15 text-accent border-accent/25 hover:bg-accent/25'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-xs uppercase tracking-widest">Players</p>
            <span className="text-xs text-muted">{players.length}/8</span>
          </div>
          <PlayerList players={players} hostPlayerId={hostPlayerId} myPlayerId={playerId} onKick={isHost ? onKick : undefined} />
          {players.length < 2 && (
            <p className="text-center text-muted text-xs mt-4">Waiting for at least one more player…</p>
          )}
        </div>

        {/* Game settings — host editable, others read-only */}
        <div className="bg-surface border border-white/[0.05] rounded-2xl p-5 space-y-4">

          {/* Round timer */}
          {isHost ? (
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-3">Round Timer</p>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setRoundSeconds(s)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      roundSeconds === s
                        ? 'bg-accent text-white border-accent shadow-[0_0_16px_rgba(99,102,241,0.3)]'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Genre filter */}
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-3">
              Theme
              {!isHost && <span className="ml-2 text-accent">{selectedGenreLabel}</span>}
            </p>
            {isHost ? (
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGenreFilter(g.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      genreFilter === g.value
                        ? 'bg-accent text-white border-accent shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={players.length < 2 || starting}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)] hover:brightness-110
              disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        ) : (
          <div className="text-center py-4 text-muted text-sm animate-pulse">
            Waiting for host to start the game…
          </div>
        )}

        <button onClick={onHome} className="w-full py-3 text-muted text-sm hover:text-white/70 transition-colors">
          ← Leave Session
        </button>

      </div>

      <ChatPanel messages={chatMessages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
