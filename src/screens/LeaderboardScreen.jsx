import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LeaderboardScreen({ user, userTotal, onClose }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_daily_leaderboard')
      .then(({ data }) => setRows(data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col gap-4 animate-fadeUp">
      <div className="text-center">
        <div className="text-xs text-muted uppercase tracking-widest mb-1">Daily Quiz</div>
        <h2 className="text-2xl font-black">Leaderboard</h2>
        <div className="text-muted text-sm mt-1">{today}</div>
      </div>

      {userTotal != null && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl py-4 text-center">
          <div className="text-muted text-xs uppercase tracking-widest mb-1">Your Score</div>
          <div className="text-4xl font-black text-accent">{userTotal}</div>
          <div className="text-muted text-xs mt-1">/ 500</div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="h-12 rounded-xl bg-surface2 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-muted text-sm">No scores yet today.</div>
        ) : (
          rows.map((row, i) => {
            const isMe = user && row.user_id === user.id
            return (
              <div
                key={row.user_id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${isMe ? 'bg-accent/5' : ''}`}
              >
                <span className={`text-sm font-black w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted'}`}>
                  {row.rank}
                </span>
                {row.avatar_url ? (
                  <img src={row.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-xs font-bold text-muted">
                    {row.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className={`flex-1 text-sm font-semibold truncate ${isMe ? 'text-accent' : ''}`}>
                  {row.display_name ?? 'Anonymous'}{isMe ? ' (you)' : ''}
                </span>
                <span className="font-black text-lg">{row.total}</span>
              </div>
            )
          })
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95"
      >
        Back to Home
      </button>
    </div>
  )
}
