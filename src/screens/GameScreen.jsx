import { useState } from 'react'
import RoundDots from '../components/RoundDots'
import MoviePoster from '../components/MoviePoster'
import RatingSlider from '../components/RatingSlider'

export default function GameScreen({ movie, round, totalRounds, runningScore, onSubmit }) {
  const [imdbGuess, setImdbGuess] = useState(5.0)
  const [rtGuess,   setRtGuess]   = useState(50)

  return (
    <div className="flex flex-col gap-4 animate-fadeUp">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-muted text-sm font-medium">Round {round + 1} of {totalRounds}</span>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-bold text-sm">
            {runningScore} <span className="text-muted font-normal">pts</span>
          </span>
          <RoundDots total={totalRounds} current={round} />
        </div>
      </div>

      {/* Movie */}
      <MoviePoster movie={movie} />

      {/* Sliders */}
      <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-7">
        <RatingSlider type="imdb" value={imdbGuess} onChange={setImdbGuess} />
        <RatingSlider type="rt"   value={rtGuess}   onChange={setRtGuess} />
      </div>

      <button
        onClick={() => onSubmit(imdbGuess, rtGuess)}
        className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
      >
        Submit Guess
      </button>
    </div>
  )
}
