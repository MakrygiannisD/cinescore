import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  {
    slug:        'top-rated',
    label:       'Top Rated',
    description: 'The highest rated films of all time',
    icon:        '★',
  },
  {
    slug:        'popular',
    label:       'Popular',
    description: 'Crowd favourites with 200k+ IMDb votes',
    icon:        '↑',
  },
  {
    slug:        'classics',
    label:       'Classics',
    description: 'The best of every decade from the 50s to 2010s',
    icon:        '◈',
  },
]

export default function HomeScreen({ user, profile, onStartGame, onStartDaily, onStartChallenge, onShowLeaderboard, onSignIn, onSignOut }) {
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

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black tracking-tight">
          Cine<span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
          >Score</span>
        </h1>
        {user === undefined ? null : user ? (
          <div className="flex items-center gap-2.5">
            {profile?.avatar_url && (
              <img src={profile.avatar_url} className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" alt="" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium text-muted hover:text-white hover:border-accent/30 transition-all"
          >
            Sign in
          </button>
        )}
      </div>

      {/* Daily Quiz card */}
      <div className="relative bg-surface border border-accent/20 rounded-2xl p-5 flex flex-col gap-3 overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.07)]">
        {/* subtle top glow line */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-accent/80 uppercase tracking-widest font-semibold mb-1">Daily Quiz</div>
            <div className="font-black text-lg leading-tight">Today's Challenge</div>
            <div className="text-muted text-xs mt-1">{today}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg">📅</div>
        </div>

        {playedToday ? (
          <button
            onClick={onShowLeaderboard}
            className="w-full py-3 bg-accent/10 border border-accent/30 text-accent font-bold rounded-xl hover:bg-accent/15 transition-all active:scale-95"
          >
            View Leaderboard →
          </button>
        ) : (
          <button
            onClick={onStartDaily}
            disabled={!ready || !!starting}
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-[0_4px_24px_rgba(99,102,241,0.3)]"
          >
            {starting === 'daily' ? 'Loading…' : 'Play Daily Quiz'}
          </button>
        )}

        {!user && !playedToday && (
          <p className="text-muted text-xs text-center">
            <button onClick={onSignIn} className="text-accent hover:underline">Sign in</button> to save your score
          </p>
        )}
      </div>

      {/* Play Now + Challenge row */}
      <div className="flex gap-3">
        <button
          onClick={() => startGame('base')}
          disabled={!ready || !!starting}
          className="flex-1 py-4 bg-surface border border-white/[0.06] text-white font-bold rounded-2xl hover:border-accent/30 hover:bg-surface2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {starting === 'base' ? 'Loading…' : '▶ Play Now'}
        </button>
        <button
          onClick={onStartChallenge}
          disabled={!ready || !!starting}
          className="flex-1 py-4 bg-surface border border-white/[0.06] text-white font-bold rounded-2xl hover:border-accent/30 hover:bg-surface2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⚔️ Challenge
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted/60 text-xs font-semibold uppercase tracking-widest">categories</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Category cards */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0,1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {CATEGORIES.map((cat, idx) => {
            const count      = counts[cat.slug] ?? 0
            const isStarting = starting === cat.slug
            const isEmpty    = count < 5
            return (
              <button
                key={cat.slug}
                onClick={() => startGame(cat.slug)}
                disabled={!!starting || isEmpty}
                className={`group bg-surface border rounded-2xl px-5 py-4 flex items-center gap-4 text-left w-full transition-all duration-200 animate-fadeUp
                  ${isEmpty ? 'border-border opacity-40 cursor-not-allowed' : 'border-white/[0.05] hover:border-accent/25 hover:bg-surface2 active:scale-[0.98] cursor-pointer'}
                  ${isStarting ? 'border-accent/30 bg-surface2' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 transition-colors
                  ${isStarting ? 'bg-accent/20 text-accent' : 'bg-surface2 text-muted group-hover:bg-accent/10 group-hover:text-accent2'}`}>
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{cat.label}</div>
                  <div className="text-muted text-xs mt-0.5">{cat.description}</div>
                </div>
                <div className="text-right shrink-0">
                  {isStarting
                    ? <span className="text-accent text-sm animate-pulse">Loading…</span>
                    : <span className="text-muted/50 text-xs">{isEmpty ? 'Soon' : `${count} films`}</span>
                  }
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  )
}
