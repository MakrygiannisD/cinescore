import { useState } from 'react'

export default function MoviePoster({ movie }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-surface2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Shimmer skeleton */}
      {!loaded && (
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background: 'linear-gradient(90deg, rgb(var(--c-surface2)) 25%, rgb(var(--c-border)) 50%, rgb(var(--c-surface2)) 75%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
      <img
        src={movie.poster_url}
        alt={movie.title}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={e => { e.target.style.display = 'none' }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
        <h2 className="font-black text-xl leading-tight text-white">{movie.title}</h2>
        <p className="text-white/50 text-sm mt-1 font-medium">
          {movie.year}
          {movie.genre ? ` · ${movie.genre.split(',')[0].trim()}` : ''}
        </p>
      </div>
    </div>
  )
}
