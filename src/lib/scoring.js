/**
 * Score a single round — IMDb only, 0–100 pts.
 *
 * Exact hit  (error = 0.0) → 100
 * error 0.1               → ~92
 * error 0.5               → ~65
 * error 1.0               → ~40
 * error 2.0               → ~10
 * error ≥ 2.5             → 0
 *
 * Formula: 100 * max(0, 1 - (error / 2.5)^1.5)
 * The 1.5 exponent makes the curve convex — small errors cost more
 * than a linear curve would, so only near-perfect guesses score high.
 */
export function scoreRound(imdbGuess, _rtGuess, imdbActual, _rtActual) {
  const error   = Math.abs(imdbGuess - imdbActual)
  const ratio   = Math.min(error / 2.5, 1)           // 0–1
  const pts     = Math.round(100 * Math.max(0, 1 - Math.pow(ratio, 1.5)))

  // Only award 100 on a truly perfect guess (exact to 1 decimal)
  const perfect = Math.round(imdbGuess * 10) === Math.round(imdbActual * 10)
  const total   = perfect ? 100 : Math.min(pts, 94)  // cap non-perfect at 94

  return { imdbPts: total, rtPts: 0, total }
}

// Game total: 5 rounds × 100 = 500 max
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
