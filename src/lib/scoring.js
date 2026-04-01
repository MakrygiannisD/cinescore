/**
 * Scoring curve — IMDb only, 0–100 pts per round, 0–500 total.
 *
 * Error  →  Score
 * 0.0        100   (perfect only)
 * 0.1         92
 * 0.3         65
 * 0.9         40
 * 1.0         20
 * ≥ 2.5        0
 *
 * Points between anchors are linearly interpolated.
 */
const CURVE = [
  [0.0, 100],
  [0.1,  92],
  [0.3,  65],
  [0.9,  40],
  [1.0,  20],
  [2.5,   0],
]

function scoreFromError(error) {
  if (error === 0) return 100
  if (error >= 2.5) return 0
  for (let i = 0; i < CURVE.length - 1; i++) {
    const [x0, y0] = CURVE[i]
    const [x1, y1] = CURVE[i + 1]
    if (error >= x0 && error <= x1) {
      const t = (error - x0) / (x1 - x0)
      return Math.round(y0 + t * (y1 - y0))
    }
  }
  return 0
}

export function scoreRound(imdbGuess, _rtGuess, imdbActual, _rtActual) {
  const error = Math.abs(Math.round(imdbGuess * 10) / 10 - Math.round(imdbActual * 10) / 10)
  const total = scoreFromError(error)
  return { imdbPts: total, rtPts: 0, total }
}

export function getGrade(totalScore, maxScore = 500) {
  const pct = totalScore / maxScore
  if (pct >= 0.95) return { label: '🎬 Film Critic',   sub: 'Extraordinary. You live and breathe cinema.' }
  if (pct >= 0.80) return { label: '🍿 Movie Buff',     sub: 'Impressive! You really know your ratings.' }
  if (pct >= 0.65) return { label: '🎥 Cinephile',      sub: 'Solid knowledge of the critical world.' }
  if (pct >= 0.45) return { label: '🎞️ Casual Viewer', sub: "Not bad — but the ratings surprised you." }
  return               { label: '😅 First Timer',      sub: 'The ratings caught you off guard this time!' }
}

export function gradeColor(totalScore, maxScore = 500) {
  const pct = totalScore / maxScore
  if (pct >= 0.95) return '#4ade80'
  if (pct >= 0.80) return '#60a5fa'
  if (pct >= 0.65) return '#6366f1'
  if (pct >= 0.45) return '#facc15'
  return '#f87171'
}
