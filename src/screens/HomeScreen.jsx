import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  {
    slug:        'top-rated',
    label:       'Top Rated',
    description: 'The highest rated films of all time',
    emoji:       '⭐',
  },
  {
    slug:        'popular',
    label:       'Popular',
    description: 'Crowd favourites with 200k+ IMDb votes',
    emoji:       '🔥',
  },
  {
    slug:        'classics',
    label:       'Classics',
    description: 'The best of every decade from the 50s to 2010s',
    emoji:       '📼',
  },
]

export default function HomeScreen({ user, profile, onStartGame, onStartDaily, onShowLeaderboard, onSignIn, onSignOut }) {
  const [listIds, setListIds]   = useState({})
  const [counts,  setCounts]    = useState({})
  const [loading, setLoading]   = useState(true)
  const [starting, setStarting] = useState(null)
  const [playedToday, setPlayedToday] = useState(false)
  const [error, setError]       = useState(null)

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
        const ids = {}, cts = {}
        for (const l of data ?? []) {
          ids[l.slug] = l.id
          cts[l.slug] = l.list_movies?.[0]?.count ?? 0
        }
        const classicsSlugs = ['50s-classics','60s-classics','70s-classics','80s-classics','90s-classics','2000s-hits','2010s-hits','2020s-hits']
        cts['classics'] = classicsSlugs.reduce((s, slug) => s + (cts[slug] ?? 0), 0)
        setListIds(ids)
        setCounts(cts)
      })
      .finally(() => setLoading(false))
  }, [])

  // Check if user already played today
  useEffect(() => {
    if (!user) { setPlayedToday(false); return }
    const today = new Date().toISOString().slice(0, 10)
    supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => setPlayedToday(!!data))
  }, [user])

  async function startGame(mode) {
    setStarting(mode)
    setError(null)
    try {
      let data, error

      if (mode === 'base') {
        ;({ data, error } = await supabase.rpc('get_base_game_movies'))
      } else if (mode === 'classics') {
        ;({ data, error } = await supabase.rpc('get_classics_movies', { p_count: 5 }))
      } else {
        ;({ data, error } = await supabase.rpc('get_random_movies', { p_list_id: listIds[mode], p_count: 5 }))
      }

      if (error) throw error
      if (!data || data.length < 5) throw new Error('Not enough movies — try again!')

      const listMeta = mode === 'base'
        ? { id: null, slug: 'base', name: 'Daily Mix' }
        : mode === 'classics'
        ? { id: null, slug: 'classics', name: 'Classics' }
        : { id: listIds[mode], slug: mode, name: CATEGORIES.find(c => c.slug === mode).label }

      onStartGame(listMeta, data)
    } catch (e) {
      setError(e.message)
    } finally {
      setStarting(null)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const ready = !loading && counts['top-rated'] >= 1

  return (
    <div className="flex flex-col gap-5 animate-fadeUp">

      {/* Header with auth */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black tracking-tight">
          Cine<span className="text-accent">Score</span>
        </h1>
        {user === undefined ? null : user ? (
          <div className="flex items-center gap-2">
            {profile?.avatar_url && (
              <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
            )}
            <button
              onClick={onSignOut}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium text-muted hover:text-white hover:border-accent/40 transition-all"
          >
            Sign in
          </button>
        )}
      </div>

      {/* Daily Quiz card */}
      <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted uppercase tracking-widest mb-1">Daily Quiz</div>
            <div className="font-black text-lg leading-tight">Today's Challenge</div>
            <div className="text-muted text-xs mt-1">{today}</div>
          </div>
          <span className="text-3xl">📅</span>
        </div>

        {playedToday ? (
          <button
            onClick={onShowLeaderboard}
            className="w-full py-3 bg-accent/10 border border-accent/30 text-accent font-bold rounded-xl hover:bg-accent/20 transition-all active:scale-95"
          >
            View Leaderboard →
          </button>
        ) : (
          <button
            onClick={onStartDaily}
            disabled={!ready || !!starting}
            className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
          >
            {starting === 'daily' ? 'Loading…' : user ? 'Play Daily Quiz' : 'Play Daily Quiz'}
          </button>
        )}

        {!user && !playedToday && (
          <p className="text-muted text-xs text-center">
            <button onClick={onSignIn} className="text-accent hover:underline">Sign in</button> to save your score to the leaderboard
          </p>
        )}
      </div>

      {/* Play Now */}
      <button
        onClick={() => startGame('base')}
        disabled={!ready || !!starting}
        className="w-full py-4 bg-surface border border-border text-white font-bold rounded-2xl hover:border-accent/40 hover:bg-surface2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {starting === 'base' ? 'Loading…' : '▶ Play Now'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted text-xs font-semibold uppercase tracking-widest">categories</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Category cards */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0,1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />)}
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
                className={`bg-surface border border-border rounded-2xl px-5 py-4 flex items-center gap-4 text-left w-full transition-all duration-200
                  ${isEmpty ? 'opacity-40 cursor-not-allowed' : 'hover:border-accent/40 hover:bg-surface2 active:scale-95 cursor-pointer'}
                  ${isStarting ? 'border-accent/50 bg-surface2' : ''}`}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{cat.label}</div>
                  <div className="text-muted text-xs mt-0.5">{cat.description}</div>
                </div>
                <div className="text-right shrink-0">
                  {isStarting
                    ? <span className="text-accent text-sm">Loading…</span>
                    : <span className="text-muted text-xs">{isEmpty ? 'Coming soon' : `${count} films`}</span>
                  }
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
