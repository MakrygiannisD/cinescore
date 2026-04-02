export default function PlayerList({ players, hostPlayerId, myPlayerId, showReady = false }) {
  return (
    <ul className="space-y-2">
      {players.map((p) => {
        const isMe   = p.player_id === myPlayerId
        const isHost = p.player_id === hostPlayerId
        return (
          <li
            key={p.player_id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
              isMe
                ? 'bg-accent/10 border-accent/30'
                : 'bg-surface border-white/[0.05]'
            }`}
          >
            {/* Online dot */}
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)] flex-shrink-0" />

            {/* Name */}
            <span className={`flex-1 text-sm font-medium ${isMe ? 'text-white' : 'text-white/80'}`}>
              {p.display_name}
              {isMe   && <span className="ml-1.5 text-accent text-xs">(you)</span>}
            </span>

            {/* Crown for host */}
            {isHost && <span className="text-yellow-400 text-sm" title="Host">♛</span>}

            {/* Ready badge */}
            {showReady && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                p.is_ready
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-white/30 border border-white/10'
              }`}>
                {p.is_ready ? 'Ready' : 'Waiting'}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
