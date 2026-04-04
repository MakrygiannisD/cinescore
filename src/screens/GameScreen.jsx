import { useState } from 'react'
import RoundDots from '../components/RoundDots'
import MoviePoster from '../components/MoviePoster'
import RatingSlider from '../components/RatingSlider'

export default function GameScreen({ movie, round, totalRounds, runningScore, onSubmit }) {
  const [imdbGuess, setImdbGuess] = useState(5.0)

  return (
    <div className="flex flex-col gap-4 animate-fadeUp">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-muted text-sm font-medium">
          Round <span className="text-white font-bold">{round + 1}</span>
          <span className="text-muted/60"> / {totalRounds}</span>
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-white/[0.06] text-sm">
            <span className="font-black text-white">{runningScore}</span>
            <span className="text-muted/60 text-xs">pts</span>
          </div>
          <RoundDots total={totalRounds} current={round} />
        </div>
      </div>

      {/* Movie */}
      <MoviePoster movie={movie} />

      {/* Slider */}
      <div className="bg-surface border border-white/[0.05] rounded-2xl p-5">
        <RatingSlider type="imdb" value={imdbGuess} onChange={setImdbGuess} />
      </div>

      <button
        onClick={() => onSubmit(imdbGuess, movie.rt_rating)}
        className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-accent hover:shadow-accent-lg"
      >
        Submit Guess
      </button>
    </div>
  )
}
