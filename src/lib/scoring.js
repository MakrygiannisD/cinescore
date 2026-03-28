/**
 * Score a single round.
 *
 * IMDB: max 50 pts. Zero points at ±3.0 difference.
 * RT:   max 50 pts. Zero points at ±30 difference.
 * Round total: 0–100.
 * Game total (5 rounds): 0–500.
 */
export function scoreRound(imdbGuess, rtGuess, imdbActual, rtActual) {
  const imdbError = Math.abs(imdbGuess - imdbActual)
  const rtError   = Math.abs(rtGuess   - rtActual)

  const imdbPts = Math.round(Math.max(0, (1 - imdbError / 3)  * 50))
  const rtPts   = Math.round(Math.max(0, (1 - rtError   / 30) * 50))

  return { imdbPts, rtPts, total: imdbPts + rtPts }
}

export function getGrade(totalScore, maxScore = 500) {
  const pct = totalScore / maxScore
  if (pct >= 0.95) return { label: '🎬 Film Critic',    sub: 'Extraordinary. You live and breathe cinema.' }
  if (pct >= 0.80) return { label: '🍿 Movie Buff',      sub: 'Impressive! You really know your ratings.' }
  if (pct >= 0.65) return { label: '🎥 Cinephile',       sub: 'Solid knowledge of the critical world.' }
  if (pct >= 0.45) return { label: '🎞️ Casual Viewer',  sub: "Not bad — but critics had surprises for you." }
  return               { label: '😅 First Timer',       sub: 'The ratings caught you off guard this time!' }
}

export function gradeColor(totalScore, maxScore = 500) {
  const pct = totalScore / maxScore
  if (pct >= 0.95) return '#4ade80'
  if (pct >= 0.80) return '#60a5fa'
  if (pct >= 0.65) return '#6366f1'
  if (pct >= 0.45) return '#facc15'
  return '#f87171'
}
