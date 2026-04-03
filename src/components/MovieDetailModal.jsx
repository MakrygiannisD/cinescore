import { useEffect } from 'react'

export default function MovieDetailModal({ movie, onClose }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!movie) return null

  const genres = movie.genre
    ? movie.genre.split(',').map(g => g.trim()).filter(Boolean)
    : []

  const imdbUrl = movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}/` : null

  function rtColor(rt) {
    if (rt == null) return '#6464a0'
    if (rt >= 75) return '#fa320a'
    if (rt >= 60) return '#fa8c00'
    return '#6464a0'
  }

  function imdbColor(r) {
    if (r >= 8.0) return '#4ade80'
    if (r >= 7.0) return '#60a5fa'
    if (r >= 6.0) return '#f5c518'
    return '#f87171'
  }

  const rating = Number(movie.imdb_rating)
  const rt     = movie.rt_rating != null ? Number(movie.rt_rating) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative w-full sm:max-w-sm bg-surface border border-white/[0.08] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fadeUp shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster + gradient overlay */}
        {movie.poster_url && (
          <div className="relative h-52 overflow-hidden">
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-full h-full object-cover object-top"
              style={{ filter: 'brightness(0.7)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

            {/* Title over poster */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <h2 className="text-xl font-black text-white leading-tight drop-shadow-lg">
                {movie.title}
              </h2>
              <p className="text-white/50 text-sm mt-0.5">{movie.year}</p>
            </div>
          </div>
        )}

        {/* No poster fallback header */}
        {!movie.poster_url && (
          <div className="px-5 pt-6 pb-2">
            <h2 className="text-xl font-black text-white">{movie.title}</h2>
            <p className="text-muted text-sm mt-0.5">{movie.year}</p>
          </div>
        )}

        {/* Body */}
        <div className="px-5 pb-6 pt-4 flex flex-col gap-4">

          {/* Ratings row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-surface2 rounded-xl p-3 text-center">
              <div className="text-xs text-muted uppercase tracking-widest mb-1">IMDb</div>
              <div
                className="text-3xl font-black"
                style={{ color: imdbColor(rating), textShadow: `0 0 20px ${imdbColor(rating)}40` }}
              >
                {rating.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted mt-0.5">/ 10</div>
            </div>

            {rt != null && (
              <div className="flex-1 bg-surface2 rounded-xl p-3 text-center">
                <div className="text-xs text-muted uppercase tracking-widest mb-1">Rotten Tomatoes</div>
                <div
                  className="text-3xl font-black"
                  style={{ color: rtColor(rt), textShadow: `0 0 20px ${rtColor(rt)}40` }}
                >
                  {rt}%
                </div>
                <div className="text-[10px] text-muted mt-0.5">
                  {rt >= 60 ? '🍅 Fresh' : '💦 Rotten'}
                </div>
              </div>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map(g => (
                <span
                  key={g}
                  className="text-xs font-medium text-white/50 bg-white/5 border border-white/[0.06] px-2.5 py-1 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* IMDb link */}
          {imdbUrl && (
            <a
              href={imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518] text-sm font-semibold hover:bg-[#f5c518]/15 transition-all"
            >
              <span>↗</span> View on IMDb
            </a>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/[0.06] text-muted text-sm font-semibold hover:text-white hover:bg-white/10 transition-all"
          >
            Close
          </button>

        </div>
      </div>
    </div>
  )
}
