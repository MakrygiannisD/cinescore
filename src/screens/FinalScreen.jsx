import { useEffect, useRef } from 'react'
import { getGrade, gradeColor } from '../lib/scoring'

export default function FinalScreen({ movies, scores, listName, isDaily, isChallenge, user, onDailyComplete, onChallengeComplete, onPlayAgain, onChangeList, onShowLeaderboard }) {
  const total            = scores.reduce((sum, s) => sum + s.total, 0)
  const { label, sub }   = getGrade(total)
  const color            = gradeColor(total)
  const submittedRef     = useRef(false)

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
      <div className="bg-surface border border-white/[0.05] rounded-2xl p-8 text-center flex flex-col items-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div
          className="w-36 h-36 rounded-full border-[6px] flex flex-col items-center justify-center animate-scaleIn"
          style={{
            borderColor: color,
            boxShadow: `0 0 40px ${color}30, 0 0 80px ${color}12`,
          }}
        >
          <span className="text-5xl font-black leading-none" style={{ color }}>{total}</span>
          <span className="text-muted/60 text-xs mt-1">/ 500</span>
        </div>
        <div className="text-xl font-black mt-1" style={{ color }}>{label}</div>
        <div className="text-muted text-sm max-w-[200px] leading-relaxed">{sub}</div>
        {listName && (
          <div className="text-xs text-muted/50 mt-1">
            Played: <span className="text-muted/80">{listName}</span>
          </div>
        )}
      </div>

      {/* Per-round breakdown */}
      <div className="flex flex-col gap-2">
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            className="bg-surface border border-white/[0.05] rounded-xl px-4 py-3 flex justify-between items-center animate-fadeUp"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <div>
              <div className="font-semibold text-sm">
                {movie.title}{' '}
                <span className="text-muted font-normal text-xs">({movie.year})</span>
              </div>
              <div className="text-muted text-xs mt-0.5">
                IMDb <strong className="text-white/60">{Number(movie.imdb_rating).toFixed(1)}</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="font-black text-lg">{scores[i].total}</span>
              <span className="text-muted/50 text-xs">/100</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {isDaily && (
          <button onClick={onShowLeaderboard} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.25)]">
            View Leaderboard →
          </button>
        )}
        {!isDaily && !isChallenge && (
          <button onClick={onPlayAgain} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.25)]">
            Play Again
          </button>
        )}
        <button onClick={onChangeList} className="w-full py-3 bg-transparent border border-white/[0.06] text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95">
          {isDaily || isChallenge ? 'Back to Home' : 'Change Category'}
        </button>
      </div>
    </div>
  )
}
