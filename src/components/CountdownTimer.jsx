export default function CountdownTimer({ secondsLeft, totalSeconds = 30 }) {
  if (secondsLeft === null) return null

  const pct    = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  const urgent = secondsLeft <= 5

  const size   = 72
  const stroke = 5
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const dash   = circ * pct

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={urgent ? '#f87171' : '#6366f1'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.5s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className={`text-lg font-black tabular-nums -mt-[58px] mb-[10px] ${
          urgent ? 'text-red-400 animate-pulse' : 'text-white'
        }`}
        style={{ lineHeight: `${size}px` }}
      >
        {secondsLeft}
      </span>
    </div>
  )
}
