import { useEffect, useRef } from 'react'
import { getGrade, gradeColor } from '../lib/scoring'

export default function FinalScreen({ movies, scores, listName, isDaily, isChallenge, user, onDailyComplete, onChallengeComplete, onPlayAgain, onChangeList, onShowLeaderboard }) {
  const total            = scores.reduce((sum, s) => sum + s.total, 0)
  const { label, sub }   = getGrade(total)
  const color            = gradeColor(total)
  const submittedRef     = useRef(false)

  // Submit score once on mount
  useEffect(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    if (isDaily)     onDailyComplete(total, scores)
    if (isChallenge) onChallengeComplete(total, scores)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 animate-fadeUp">

      {isDaily && (
        <div className="text-center text-xs text-accent font-bold uppercase tracking-widest">
          Daily Quiz
        </div>
      )}

      {/* Score hero */}
      <div className="bg-surface border border-border rounded-2xl p-8 text-center flex flex-col items-center gap-3">
        <div
          className="w-36 h-36 rounded-full border-8 flex flex-col items-center justify-center"
          style={{ borderColor: color }}
        >
          <span className="text-5xl font-black leading-none" style={{ color }}>{total}</span>
          <span className="text-muted text-xs mt-1">/ 500</span>
        </div>
        <div className="text-xl font-bold mt-1">{label}</div>
        <div className="text-muted text-sm">{sub}</div>
        {listName && (
          <div className="text-xs text-muted/60 mt-1">
            Played: <span className="text-muted">{listName}</span>
          </div>
        )}
      </div>

      {/* Per-round breakdown */}
      <div className="flex flex-col gap-2">
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            className="bg-surface border border-border rounded-xl px-4 py-3 flex justify-between items-center animate-fadeUp"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div>
              <div className="font-semibold text-sm">
                {movie.title}{' '}
                <span className="text-muted font-normal text-xs">({movie.year})</span>
              </div>
              <div className="text-muted text-xs mt-0.5">
                IMDb <strong className="text-white/70">{Number(movie.imdb_rating).toFixed(1)}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="font-black text-lg">{scores[i].total}</span>
              <span className="text-muted text-xs">/100</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {isDaily && (
          <button onClick={onShowLeaderboard} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">
            View Leaderboard →
          </button>
        )}
        {!isDaily && !isChallenge && (
          <button onClick={onPlayAgain} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">
            Play Again
          </button>
        )}
        <button onClick={onChangeList} className="w-full py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95">
          {isDaily || isChallenge ? 'Back to Home' : 'Change Category'}
        </button>
      </div>
    </div>
  )
}
