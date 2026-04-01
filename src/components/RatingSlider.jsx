export default function RatingSlider({ type, value, onChange }) {
  const isImdb = type === 'imdb'

  const min     = 0
  const max     = isImdb ? 10 : 100
  const step    = isImdb ? 0.1 : 1
  const display = isImdb ? value.toFixed(1) : `${value}%`
  const ticks   = isImdb
    ? ['0', '2', '4', '6', '8', '10']
    : ['0%', '25%', '50%', '75%', '100%']
  const fillColor = isImdb ? '#f5c518' : '#fa320a'
  const fillPct   = ((value - min) / (max - min)) * 100

  function handleChange(e) {
    const raw = parseFloat(e.target.value)
    onChange(isImdb ? raw : Math.round(raw))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
              isImdb ? 'bg-imdb/15 text-imdb' : 'bg-rt/15 text-rt'
            }`}
          >
            {isImdb ? 'IMDb' : 'RT'}
          </span>
          <span className="text-muted text-sm">Your guess</span>
        </div>
        <span className="text-3xl font-black tabular-nums" style={{ color: fillColor }}>
          {display}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{
          '--fill-pct':  `${fillPct}%`,
          '--fill-color': fillColor,
        }}
      />

      <div className="flex justify-between text-muted/60 text-xs px-0.5 font-medium">
        {ticks.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  )
}
