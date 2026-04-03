import { useEffect } from 'react'

export default function MovieDetailModal({ movie, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!movie) return null

  const genres   = movie.genre ? movie.genre.split(',').map(g => g.trim()).filter(Boolean) : []
  const actors   = movie.actors ? movie.actors.split(',').map(a => a.trim()).filter(Boolean) : []
  const imdbUrl  = movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}/` : null
  const rating   = Number(movie.imdb_rating)
  const rt       = movie.rt_rating != null ? Number(movie.rt_rating) : null
  const meta     = movie.metascore != null ? Number(movie.metascore) : null
  const votes    = movie.imdb_votes ? Number(movie.imdb_votes).toLocaleString() : null
  const runtime  = movie.runtime ? `${movie.runtime} min` : null

  function imdbColor(r) {
    if (r >= 8.0) return '#4ade80'
    if (r >= 7.0) return '#60a5fa'
    if (r >= 6.0) return '#f5c518'
    return '#f87171'
  }
  function rtColor(r) {
    if (r >= 75) return '#fa320a'
    if (r >= 60) return '#fa8c00'
    return '#6464a0'
  }
  function metaColor(m) {
    if (m >= 75) return '#4ade80'
    if (m >= 60) return '#facc15'
    return '#f87171'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full sm:max-w-sm max-h-[92dvh] flex flex-col bg-[#0d0d14] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fadeUp shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* Poster hero */}
        <div className="relative h-56 shrink-0 overflow-hidden">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover object-top scale-105"
              style={{ filter: 'brightness(0.55)' }}
            />
          ) : (
            <div className="w-full h-full bg-surface2" />
          )}
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] via-[#0d0d14]/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            ✕
          </button>

          {/* Rated + Runtime badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {movie.rated && movie.rated !== 'N/A' && (
              <span className="text-[10px] font-bold text-white/70 bg-black/50 border border-white/10 px-2 py-0.5 rounded-md">
                {movie.rated}
              </span>
            )}
            {runtime && (
              <span className="text-[10px] font-bold text-white/70 bg-black/50 border border-white/10 px-2 py-0.5 rounded-md">
                {runtime}
              </span>
            )}
          </div>

          {/* Title over poster */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <h2 className="text-xl font-black text-white leading-tight">{movie.title}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-white/45 text-sm">{movie.year}</span>
              {movie.country && movie.country !== 'N/A' && (
                <span className="text-white/30 text-xs">· {movie.country.split(',')[0].trim()}</span>
              )}
              {movie.language && movie.language !== 'N/A' && (
                <span className="text-white/30 text-xs">· {movie.language.split(',')[0].trim()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

          {/* Ratings row */}
          <div className="grid grid-cols-3 gap-2">
            <RatingBadge
              label="IMDb"
              value={rating.toFixed(1)}
              sub={votes ? `${votes} votes` : '/10'}
              color={imdbColor(rating)}
            />
            {rt != null && (
              <RatingBadge
                label="Tomatometer"
                value={`${rt}%`}
                sub={rt >= 60 ? '🍅 Fresh' : '💦 Rotten'}
                color={rtColor(rt)}
              />
            )}
            {meta != null && (
              <RatingBadge
                label="Metacritic"
                value={meta}
                sub="/100"
                color={metaColor(meta)}
              />
            )}
          </div>

          {/* Plot */}
          {movie.plot && movie.plot !== 'N/A' && (
            <div>
              <SectionLabel>Plot</SectionLabel>
              <p className="text-white/60 text-sm leading-relaxed line-clamp-4">{movie.plot}</p>
            </div>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map(g => (
                <span key={g} className="text-xs font-medium text-white/50 bg-white/5 border border-white/[0.06] px-2.5 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Cast & Crew */}
          <div className="space-y-2.5">
            {movie.director && movie.director !== 'N/A' && (
              <MetaRow label="Director" value={movie.director} />
            )}
            {movie.writer && movie.writer !== 'N/A' && (
              <MetaRow label="Writer" value={movie.writer} />
            )}
            {actors.length > 0 && (
              <div>
                <SectionLabel>Cast</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {actors.map(a => (
                    <span key={a} className="text-xs text-white/60 bg-white/5 border border-white/[0.06] px-2.5 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Awards + Box office */}
          <div className="space-y-2">
            {movie.awards && movie.awards !== 'N/A' && (
              <div className="flex items-start gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">🏆</span>
                <span className="text-xs text-white/55 leading-relaxed">{movie.awards}</span>
              </div>
            )}
            {movie.box_office && movie.box_office !== 'N/A' && (
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0">💰</span>
                <div>
                  <div className="text-[10px] text-muted uppercase tracking-widest">Box Office</div>
                  <div className="text-sm font-bold text-white/70">{movie.box_office}</div>
                </div>
              </div>
            )}
          </div>

          {/* Released */}
          {movie.released && movie.released !== 'N/A' && (
            <MetaRow label="Released" value={movie.released} />
          )}

          {/* External links */}
          <div className="flex gap-2">
            {imdbUrl && (
              <a
                href={imdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518] text-sm font-semibold hover:bg-[#f5c518]/15 transition-all"
              >
                ↗ IMDb
              </a>
            )}
            {movie.imdb_id && (
              <a
                href={`https://web.stremio.com/#/detail/movie/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#7b5ea7]/15 border border-[#7b5ea7]/30 text-[#b08fe8] text-sm font-semibold hover:bg-[#7b5ea7]/25 transition-all"
              >
                ↗ Stremio
              </a>
            )}
          </div>

          {/* Bottom spacer for mobile swipe area */}
          <div className="h-2" />
        </div>

      </div>
    </div>
  )
}

function RatingBadge({ label, value, sub, color }) {
  return (
    <div className="bg-surface2 rounded-xl p-2.5 text-center flex flex-col items-center gap-0.5">
      <div className="text-[10px] text-muted uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black leading-none" style={{ color, textShadow: `0 0 16px ${color}40` }}>
        {value}
      </div>
      <div className="text-[10px] text-muted/70">{sub}</div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] text-muted uppercase tracking-widest mb-1">{children}</div>
  )
}

function MetaRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] text-muted uppercase tracking-widest shrink-0 w-16 pt-0.5">{label}</span>
      <span className="text-sm text-white/60 leading-snug">{value}</span>
    </div>
  )
}
