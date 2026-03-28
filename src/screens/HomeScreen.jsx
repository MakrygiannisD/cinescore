import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGameSetup } from '../hooks/useGameSetup'

export default function HomeScreen({ onStartGame }) {
  const { lists, loading, error: listsError } = useGameSetup()
  const [starting, setStarting] = useState(null)
  const [startError, setStartError] = useState(null)

  async function handleSelectList(list) {
    if (list.movieCount < 5) return
    setStarting(list.id)
    setStartError(null)

    try {
      const { data, error } = await supabase.rpc('get_random_movies', {
        p_list_id: list.id,
        p_count: 5,
      })
      if (error) throw error
      if (!data || data.length < 5) throw new Error(`Not enough movies in "${list.name}" yet.`)
      onStartGame(list, data)
    } catch (e) {
      setStartError(e.message)
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeUp">
      {/* Brand */}
      <div className="text-center pt-2">
        <h1 className="text-4xl font-black tracking-tight">
          Cine<span className="text-accent">Score</span>
        </h1>
        <p className="text-muted text-sm mt-2 leading-relaxed">
          Guess the IMDb &amp; Rotten Tomatoes ratings.<br />
          Choose a category to play.
        </p>
      </div>

      {/* List grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lists.map(list => {
            const isEmpty    = list.movieCount < 5
            const isStarting = starting === list.id

            return (
              <button
                key={list.id}
                onClick={() => handleSelectList(list)}
                disabled={!!starting || isEmpty}
                className={`
                  bg-surface border border-border rounded-2xl p-4 text-left
                  transition-all duration-200 group
                  ${isEmpty
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:border-accent/40 hover:bg-surface2 active:scale-95 cursor-pointer'
                  }
                  ${isStarting ? 'border-accent/50 bg-surface2' : ''}
                `}
              >
                <div className="text-2xl mb-2">{list.emoji}</div>
                <div className="font-bold text-sm leading-tight">{list.name}</div>
                <div className="text-xs mt-1.5 text-muted">
                  {isStarting
                    ? <span className="text-accent">Loading…</span>
                    : isEmpty
                      ? 'Coming soon'
                      : `${list.movieCount} movies`
                  }
                </div>
                {list.description && !isEmpty && (
                  <div className="text-xs text-muted mt-1 leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-200 line-clamp-2">
                    {list.description}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Errors */}
      {(listsError || startError) && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-red-400 text-sm text-center">
          {listsError || startError}
        </div>
      )}
    </div>
  )
}
