import { useEffect, useState } from 'react'
import RoundDots from '../components/RoundDots'

function diffPill(diff, great, ok) {
  if (diff === 0)      return { text: 'Perfect!',    cls: 'bg-green-500/15 text-green-400' }
  if (diff <= great)   return { text: `±${diff}`,    cls: 'bg-green-500/10 text-green-400' }
  if (diff <= ok)      return { text: `±${diff}`,    cls: 'bg-yellow-400/10 text-yellow-400' }
  return                      { text: `±${diff}`,    cls: 'bg-red-500/10 text-red-400' }
}

function RatingReveal({ label, isImdb, actual, guess, score }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [])

  const actualPct = isImdb ? (actual / 10) * 100 : actual
  const guessPct  = isImdb ? (guess  / 10) * 100 : guess
  const diff      = Math.round(Math.abs(guess - actual) * (isImdb ? 10 : 1)) / (isImdb ? 10 : 1)
  const pill      = diffPill(diff, isImdb ? 0.5 : 5, isImdb ? 1.5 : 15)
  const barColor  = isImdb ? '#f5c518' : '#fa320a'
  const pillLabel = isImdb ? label : `${diff}%`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span
          className={`px-2 py-0.5 rounded text-xs font-black ${
            isImdb ? 'bg-imdb text-black' : 'bg-rt text-white'
          }`}
        >
          {label}
        </span>
        <span className="text-2xl font-black">
          {isImdb ? actual.toFixed(1) : `${actual}%`}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-2 bg-border rounded-full">
        <div
          className="absolute h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: animate ? `${actualPct}%` : '0%', background: barColor }}
        />
        {/* Guess marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/60 rounded-full transition-all duration-700 ease-out"
          style={{ left: animate ? `calc(${guessPct}% - 1px)` : '0%' }}
        />
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-muted">
          Your guess:{' '}
          <strong className="text-white">
            {isImdb ? guess.toFixed(1) : `${guess}%`}
          </strong>
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${pill.cls}`}>
          {diff === 0 ? 'Perfect!' : isImdb ? `±${diff}` : `±${diff}%`}
        </span>
      </div>
    </div>
  )
}

export default function RevealScreen({ movie, imdbGuess, rtGuess, score, round, totalRounds, isLastRound, onNext }) {
  return (
    <div className="flex flex-col gap-4 animate-fadeUp">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-muted text-sm">Round {round + 1} of {totalRounds}</span>
        <RoundDots total={totalRounds} current={round} />
      </div>

      {/* Reveal card */}
      <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-5">
        <p className="text-muted text-xs font-bold uppercase tracking-widest">How close were you?</p>

        <RatingReveal
          label="IMDb"
          isImdb
          actual={movie.imdb_rating}
          guess={imdbGuess}
          score={score.imdbPts}
        />

        <div className="h-px bg-border" />

        <RatingReveal
          label="RT"
          isImdb={false}
          actual={movie.rt_rating}
          guess={rtGuess}
          score={score.rtPts}
        />
      </div>

      {/* Round score */}
      <div className="bg-surface border border-border rounded-2xl py-5 text-center">
        <div className="text-muted text-xs uppercase tracking-widest mb-1">Round Score</div>
        <div className="text-5xl font-black">
          {score.total}
          <span className="text-muted text-lg font-normal">/100</span>
        </div>
        <div className="text-muted text-xs mt-2">
          IMDb {score.imdbPts}pts &nbsp;·&nbsp; RT {score.rtPts}pts
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
      >
        {isLastRound ? 'See Final Score →' : 'Next Round →'}
      </button>
    </div>
  )
}
