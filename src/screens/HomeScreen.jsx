import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  {
    slug:        'top-rated',
    label:       'Top Rated',
    description: 'The highest rated films of all time',
    emoji:       '⭐',
    fetch:       (id) => supabase.rpc('get_random_movies', { p_list_id: id, p_count: 5 }),
  },
  {
    slug:        'popular',
    label:       'Popular',
    description: 'Crowd favourites with 200k+ IMDb votes',
    emoji:       '🔥',
    fetch:       (id) => supabase.rpc('get_random_movies', { p_list_id: id, p_count: 5 }),
  },
  {
    slug:        'classics',
    label:       'Classics',
    description: 'The best of every decade from the 50s to 2010s',
    emoji:       '📼',
    fetch:       () => supabase.rpc('get_classics_movies', { p_count: 5 }),
  },
]

export default function HomeScreen({ onStartGame }) {
  const [listIds, setListIds]     = useState({})   // slug → id
  const [counts,  setCounts]      = useState({})   // slug → movieCount
  const [loading, setLoading]     = useState(true)
  const [starting, setStarting]   = useState(null) // slug | 'base'
  const [error, setError]         = useState(null)

  useEffect(() => {
    supabase
      .from('lists')
      .select('id, slug, list_movies(count)')
      .in('slug', ['top-rated', 'popular',
        '50s-classics','60s-classics','70s-classics','80s-classics',
        '90s-classics','2000s-hits','2010s-hits','2020s-hits',
      ])
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); return }
        const ids = {}
        const cts = {}
        for (const l of data ?? []) {
          ids[l.slug] = l.id
          cts[l.slug] = l.list_movies?.[0]?.count ?? 0
        }
        // classics count = distinct union (approximate as sum for display)
        const classicsSlugs = ['50s-classics','60s-classics','70s-classics','80s-classics','90s-classics','2000s-hits','2010s-hits','2020s-hits']
        cts['classics'] = classicsSlugs.reduce((s, slug) => s + (cts[slug] ?? 0), 0)
        setListIds(ids)
        setCounts(cts)
      })
      .finally(() => setLoading(false))
  }, [])

  async function startGame(mode) {
    setStarting(mode)
    setError(null)
    try {
      let data, error

      if (mode === 'base') {
        ;({ data, error } = await supabase.rpc('get_base_game_movies'))
      } else {
        const cat = CATEGORIES.find(c => c.slug === mode)
        ;({ data, error } = await cat.fetch(listIds[mode]))
      }

      if (error) throw error
      if (!data || data.length < 5) throw new Error('Not enough movies — try again!')

      const listMeta = mode === 'base'
        ? { id: null, slug: 'base', name: 'Daily Mix' }
        : { id: listIds[mode], slug: mode, name: CATEGORIES.find(c => c.slug === mode).label }

      onStartGame(listMeta, data)
    } catch (e) {
      setError(e.message)
    } finally {
      setStarting(null)
    }
  }

  const ready = !loading && counts['top-rated'] >= 1 && counts['popular'] >= 1

  return (
    <div className="flex flex-col gap-6 animate-fadeUp">

      {/* Brand */}
      <div className="text-center pt-2">
        <h1 className="text-4xl font-black tracking-tight">
          Cine<span className="text-accent">Score</span>
        </h1>
        <p className="text-muted text-sm mt-2 leading-relaxed">
          Guess the IMDb rating.<br />How well do you know your movies?
        </p>
      </div>

      {/* Play Now */}
      <button
        onClick={() => startGame('base')}
        disabled={!ready || !!starting}
        className="w-full py-5 bg-accent text-white font-black text-lg rounded-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {starting === 'base' ? (
          <span className="text-accent-foreground opacity-80">Loading…</span>
        ) : (
          <>▶ Play Now</>
        )}
      </button>

      {/* Category label */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted text-xs font-semibold uppercase tracking-widest">or pick a category</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Category cards */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {CATEGORIES.map(cat => {
            const count      = counts[cat.slug] ?? 0
            const isStarting = starting === cat.slug
            const isEmpty    = count < 5

            return (
              <button
                key={cat.slug}
                onClick={() => startGame(cat.slug)}
                disabled={!!starting || isEmpty}
                className={`
                  bg-surface border border-border rounded-2xl px-5 py-4
                  flex items-center gap-4 text-left w-full
                  transition-all duration-200
                  ${isEmpty
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:border-accent/40 hover:bg-surface2 active:scale-95 cursor-pointer'
                  }
                  ${isStarting ? 'border-accent/50 bg-surface2' : ''}
                `}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{cat.label}</div>
                  <div className="text-muted text-xs mt-0.5">{cat.description}</div>
                </div>
                <div className="text-right shrink-0">
                  {isStarting ? (
                    <span className="text-accent text-sm">Loading…</span>
                  ) : (
                    <span className="text-muted text-xs">{isEmpty ? 'Coming soon' : `${count} films`}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  )
}
