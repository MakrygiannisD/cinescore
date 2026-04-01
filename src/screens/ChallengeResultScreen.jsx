import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getGrade, gradeColor } from '../lib/scoring'

export default function ChallengeResultScreen({ challengeId, myName, myTotal, movies, onPlayAgain, onHome }) {
  const [rivals, setRivals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [newEntry, setNewEntry] = useState(null)  // name of latest joiner for flash

  async function fetchScores() {
    const { data } = await supabase
      .from('challenge_scores')
      .select('display_name, total, completed_at')
      .eq('challenge_id', challengeId)
      .order('total', { ascending: false })
    setRivals(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchScores()

    // Real-time: re-fetch whenever a new score is inserted for this challenge
    const channel = supabase
      .channel(`challenge-${challengeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenge_scores', filter: `challenge_id=eq.${challengeId}` },
        (payload) => {
          setNewEntry(payload.new.display_name)
          setTimeout(() => setNewEntry(null), 3000)
          fetchScores()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [challengeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { label } = getGrade(myTotal)
  const color     = gradeColor(myTotal)
  const shareUrl  = `${window.location.origin}?challenge=${challengeId}`
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeUp">

      {/* New player toast */}
      {newEntry && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-accent text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg animate-fadeUp">
          🎬 {newEntry} just finished!
        </div>
      )}

      <div className="text-center">
        <div className="text-xs text-accent font-bold uppercase tracking-widest mb-1">1v1 Challenge</div>
        <h2 className="text-2xl font-black">Results</h2>
      </div>

      {/* Your score */}
      <div className="bg-surface border border-border rounded-2xl p-6 text-center flex flex-col items-center gap-2">
        <div
          className="w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center"
          style={{ borderColor: color }}
        >
          <span className="text-4xl font-black leading-none" style={{ color }}>{myTotal}</span>
          <span className="text-muted text-xs mt-0.5">/ 500</span>
        </div>
        <div className="font-bold">{myName}</div>
        <div className="text-muted text-sm">{label}</div>
      </div>

      {/* Rival scores */}
      {loading ? (
        <div className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
      ) : rivals.length > 1 ? (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted font-semibold uppercase tracking-widest">Leaderboard</span>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
          {rivals.map((r, i) => {
            const isMe = r.display_name === myName && r.total === myTotal
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${isMe ? 'bg-accent/5' : ''}`}
              >
                <span className={`text-sm font-black w-5 ${i === 0 ? 'text-yellow-400' : 'text-muted'}`}>
                  {i + 1}
                </span>
                <span className={`flex-1 text-sm font-semibold ${isMe ? 'text-accent' : ''}`}>
                  {r.display_name}{isMe ? ' (you)' : ''}
                </span>
                <span className="font-black text-lg">{r.total}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-4 text-center flex flex-col items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Waiting for others…
          </span>
          <span className="text-muted text-sm">Share the link below to challenge someone!</span>
        </div>
      )}

      {/* Movie breakdown */}
      <div className="flex flex-col gap-2">
        {movies.map((movie, i) => (
          <div key={movie.id} className="bg-surface border border-border rounded-xl px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{movie.title} <span className="text-muted font-normal text-xs">({movie.year})</span></div>
              <div className="text-muted text-xs mt-0.5">IMDb <strong className="text-white/70">{Number(movie.imdb_rating).toFixed(1)}</strong></div>
            </div>
          </div>
        ))}
      </div>

      {/* Share link */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-sm font-bold text-center">Challenge a friend</div>
        <div className="flex gap-2">
          <div className="flex-1 bg-surface2 rounded-xl px-3 py-2 text-xs text-muted font-mono truncate">
            {shareUrl}
          </div>
          <button
            onClick={copyLink}
            className={`px-4 py-2 text-sm font-bold rounded-xl shrink-0 transition-all active:scale-95 ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-accent text-white hover:opacity-90'}`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onPlayAgain}
          className="w-full py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95"
        >
          New Challenge
        </button>
        <button
          onClick={onHome}
          className="w-full py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95"
        >
          Home
        </button>
      </div>
    </div>
  )
}
