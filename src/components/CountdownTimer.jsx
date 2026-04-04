export default function CountdownTimer({ secondsLeft, totalSeconds }) {
  const size   = 40
  const stroke = 3
  const r      = (size - stroke) / 2
  const C      = 2 * Math.PI * r
  const frac   = Math.max(0, secondsLeft / totalSeconds)
  const offset = C * (1 - frac)
  const urgent = secondsLeft <= 5

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={urgent ? 'rgb(var(--c-danger))' : 'rgb(var(--c-accent))'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className={`absolute text-xs font-bold ${urgent ? 'text-red-400' : 'text-white/60'}`}>
        {secondsLeft}
      </span>
    </div>
  )
}
