import { useEffect, useRef, useState } from 'react'
import { getGrade, gradeColor } from '../lib/scoring'
import MovieDetailModal from '../components/MovieDetailModal'
import ShareCard from '../components/ShareCard'

export default function FinalScreen({ movies, scores, listName, isDaily, isChallenge, user, onDailyComplete, onChallengeComplete, onPlayAgain, onChangeList, onShowLeaderboard }) {
  const total            = scores.reduce((sum, s) => sum + s.total, 0)
  const { label, sub }   = getGrade(total)
  const color            = gradeColor(total)
  const submittedRef     = useRef(false)
  const [selectedMovie, setSelectedMovie] = useState(null)

  useEffect(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    if (isDaily)     onDailyComplete(total, scores)
    if (isChallenge) onChallengeComplete(total, scores)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 animate-fadeUp">
      {selectedMovie && <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}

      {isDaily && (
        <div className="text-center text-xs text-accent font-bold uppercase tracking-widest">
          Daily Quiz
        </div>
      )}

      {/* Shareable card */}
      <ShareCard
        total={total}
        maxScore={500}
        roundScores={scores.map(s => s.total)}
        mode={isDaily ? 'daily' : 'practice'}
        listName={listName}
        posterUrl={movies[scores.reduce((best, s, i) => s.total > scores[best].total ? i : best, 0)]?.poster_url}
      />

      {/* Per-round breakdown */}
      <div className="flex flex-col gap-2">
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            className="bg-surface border border-white/[0.05] rounded-xl px-4 py-3 flex justify-between items-center animate-fadeUp"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <div className="flex-1 min-w-0">
              <button
                onClick={() => setSelectedMovie(movie)}
                className="font-semibold text-sm text-left hover:text-accent transition-colors underline-offset-2 hover:underline"
              >
                {movie.title}
              </button>
              <span className="text-muted font-normal text-xs ml-1.5">({movie.year})</span>
              <div className="text-muted text-xs mt-0.5">
                IMDb <strong className="text-white/60">{Number(movie.imdb_rating).toFixed(1)}</strong>
              </div>
            </div>
            <div className="text-right ml-3 shrink-0">
              <span className="font-black text-lg">{scores[i].total}</span>
              <span className="text-muted/50 text-xs">/100</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {isDaily && (
          <button onClick={onShowLeaderboard} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-accent">
            View Leaderboard →
          </button>
        )}
        {!isDaily && !isChallenge && (
          <button onClick={onPlayAgain} className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-accent">
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
