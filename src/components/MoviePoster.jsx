import { useState } from 'react'

export default function MoviePoster({ movie }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] bg-surface2">
        {!loaded && (
          <div
            className="absolute inset-0 animate-shimmer rounded-t-2xl"
            style={{
              background: 'linear-gradient(90deg, #222228 25%, #2e2e3a 50%, #222228 75%)',
              backgroundSize: '200% 100%',
            }}
          />
        )}
        <img
          src={movie.poster_url}
          alt={movie.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <h2 className="font-bold text-lg leading-tight">{movie.title}</h2>
        <p className="text-muted text-sm mt-1">
          {movie.year}
          {movie.genre ? ` · ${movie.genre.split(',')[0].trim()}` : ''}
        </p>
      </div>
    </div>
  )
}
