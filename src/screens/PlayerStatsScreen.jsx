import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreatePlayerId, getPlayerName } from '../lib/session'
import { gradeColor } from '../lib/scoring'

export default function PlayerStatsScreen({ onClose }) {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  const playerId   = getOrCreatePlayerId()
  const playerName = getPlayerName()

  useEffect(() => {
    supabase
      .from('session_guesses')
      .select('score, streak_bonus, game_number, session_id, round')
      .eq('player_id', playerId)
      .then(({ data }) => {
        if (!data || data.length === 0) { setStats(null); setLoading(false); return }

        const totalRounds      = data.length
        const totalScore       = data.reduce((s, g) => s + g.score + (g.streak_bonus || 0), 0)
        const avgPerRound      = Math.round(totalScore / totalRounds)
        const perfectRounds    = data.filter(g => g.score === 100).length
        const totalStreakBonus = data.reduce((s, g) => s + (g.streak_bonus || 0), 0)

        // Per-game totals
        const gameMap = {}
        data.forEach(g => {
          const key = `${g.session_id}-${g.game_number}`
          gameMap[key] = (gameMap[key] || 0) + g.score + (g.streak_bonus || 0)
        })
        const gameScores = Object.values(gameMap)
        const totalGames = gameScores.length
        const bestGame   = Math.max(...gameScores)

        setStats({ totalRounds, totalScore, avgPerRound, perfectRounds, totalGames, bestGame, totalStreakBonus })
        setLoading(false)
      })
  }, [playerId])

  if (loading) return (
    <div className="flex flex-col gap-4 animate-fadeUp">
      <div className="h-8 w-32 bg-surface rounded-xl animate-pulse" />
      <div className="h-48 bg-surface rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 animate-fadeUp">

      <div className="flex items-center gap-3 pt-1">
        <button onClick={onClose} className="text-muted hover:text-white transition-colors text-sm">← Back</button>
        <h2 className="text-xl font-black">My Stats</h2>
      </div>

      <div className="text-center py-2">
        <div className="text-white/40 text-xs uppercase tracking-widest mb-1">Player</div>
        <div className="text-2xl font-black text-white">{playerName || 'Anonymous'}</div>
      </div>

      {!stats ? (
        <div className="bg-surface border border-white/[0.05] rounded-2xl p-10 text-center">
          <div className="text-5xl mb-3">🎬</div>
          <div className="text-white/60 text-sm">No multiplayer games yet.</div>
          <div className="text-muted text-xs mt-1">Join a session to start tracking stats.</div>
        </div>
      ) : (
        <>
          {/* Accuracy grade */}
          <div className="bg-surface border border-white/[0.05] rounded-2xl p-5 text-center">
            <div className="text-muted text-xs uppercase tracking-widest mb-2">Average per Round</div>
            <div
              className="text-5xl font-black"
              style={{ color: gradeColor(stats.avgPerRound, 100), textShadow: `0 0 30px ${gradeColor(stats.avgPerRound, 100)}50` }}
            >
              {stats.avgPerRound}
            </div>
            <div className="text-white/30 text-sm mt-0.5">out of 100</div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon="🎮" label="Games Played"   value={stats.totalGames} />
            <StatCard icon="🎬" label="Rounds Played"  value={stats.totalRounds} />
            <StatCard icon="⭐" label="Total Score"    value={stats.totalScore.toLocaleString()} accent />
            <StatCard icon="🏆" label="Best Game"      value={`${stats.bestGame}/500`} />
            <StatCard icon="🎯" label="Perfect Rounds" value={stats.perfectRounds} />
            {stats.totalStreakBonus > 0
              ? <StatCard icon="🔥" label="Streak Bonus" value={`+${stats.totalStreakBonus}`} />
              : <StatCard icon="📊" label="Avg / Round"  value={`${stats.avgPerRound} pts`} />
            }
          </div>
        </>
      )}

    </div>
  )
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className={`bg-surface border rounded-2xl p-4 flex flex-col gap-1 ${accent ? 'border-accent/20' : 'border-white/[0.05]'}`}>
      <div className="text-xl">{icon}</div>
      <div className={`text-2xl font-black leading-none ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}
