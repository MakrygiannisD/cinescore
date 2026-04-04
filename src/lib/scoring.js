/**
 * Scoring curve — IMDb only, 0–100 pts per round, 0–500 total.
 *
 * Error  →  Score
 * 0.0        100   (perfect)
 * 0.2         85
 * 0.5         65
 * 1.0         40
 * 2.0         10
 * ≥ 3.0        0
 *
 * Points between anchors are linearly interpolated.
 */
const CURVE = [
  [0.0, 100],
  [0.2,  85],
  [0.5,  65],
  [1.0,  40],
  [2.0,  10],
  [3.0,   0],
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

/* Grade labels + colors — all use CSS custom properties */
const GRADES = [
  { min: 0.95, label: '🎬 Film Critic',    sub: 'Extraordinary. You live and breathe cinema.', color: 'rgb(var(--c-success))' },
  { min: 0.80, label: '🍿 Movie Buff',      sub: 'Impressive! You really know your ratings.',   color: 'rgb(var(--c-info))' },
  { min: 0.65, label: '🎥 Cinephile',       sub: 'Solid knowledge of the critical world.',      color: 'rgb(var(--c-accent))' },
  { min: 0.45, label: '🎞️ Casual Viewer',  sub: "Not bad — but the ratings surprised you.",    color: 'rgb(var(--c-warning))' },
  { min: 0,    label: '😅 First Timer',      sub: 'The ratings caught you off guard this time!', color: 'rgb(var(--c-danger))' },
]

export function getGrade(totalScore, maxScore = 500) {
  const pct = totalScore / maxScore
  const g = GRADES.find(g => pct >= g.min) || GRADES[GRADES.length - 1]
  return { label: g.label, sub: g.sub }
}

export function gradeColor(totalScore, maxScore = 500) {
  const pct = totalScore / maxScore
  const g = GRADES.find(g => pct >= g.min) || GRADES[GRADES.length - 1]
  return g.color
}
