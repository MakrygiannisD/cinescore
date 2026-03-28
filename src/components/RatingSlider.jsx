export default function RatingSlider({ type, value, onChange }) {
  const isImdb = type === 'imdb'

  const label   = isImdb ? 'IMDb' : 'RT'
  const min     = 0
  const max     = isImdb ? 10 : 100
  const step    = isImdb ? 0.1 : 1
  const display = isImdb ? value.toFixed(1) : `${value}%`
  const ticks   = isImdb
    ? ['0', '2', '4', '6', '8', '10']
    : ['0%', '25%', '50%', '75%', '100%']

  function handleChange(e) {
    const raw = parseFloat(e.target.value)
    onChange(isImdb ? raw : Math.round(raw))
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-black ${
              isImdb ? 'bg-imdb text-black' : 'bg-rt text-white'
            }`}
          >
            {label}
          </span>
          <span className="text-muted text-sm">Your guess</span>
        </div>
        <span className="text-2xl font-black tabular-nums">{display}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{ accentColor: isImdb ? '#f5c518' : '#fa320a' }}
      />

      <div className="flex justify-between text-muted text-xs px-0.5">
        {ticks.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  )
}
