import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSessionTimer } from '../hooks/useSessionTimer'
import MoviePoster from '../components/MoviePoster'
import RatingSlider from '../components/RatingSlider'
import RoundDots from '../components/RoundDots'
import CountdownTimer from '../components/CountdownTimer'
import ChatPanel from '../components/ChatPanel'

const ROUNDS = 5

export default function SessionGameScreen({
  session,
  movies,
  players,
  playerId,
  isHost,
  submittedCount,
  chatMessages,
  sendChatMessage,
  displayName,
  onGuessSubmitted,  // (guess, score) → stored in App for reveal screen
  onTimerExpired,    // () → host calls triggerReveal
}) {
  const [imdbGuess, setImdbGuess] = useState(5.0)
  const [submitted, setSubmitted] = useState(false)
  const [myScore, setMyScore]     = useState(null)
  const [myBonus, setMyBonus]     = useState(0)
  const submittedRef              = useRef(false)
  const imdbGuessRef              = useRef(5.0)
  const mountedAtRef              = useRef(Date.now())

  const round    = session.current_round
  const movie    = movies?.[round]
  const deadline = session.round_deadline

  // Keep ref in sync for use inside timer callback
  useEffect(() => { imdbGuessRef.current = imdbGuess }, [imdbGuess])

  async function submitGuess(guess) {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)

    const { data, error } = await supabase.rpc('submit_session_guess', {
      p_session_id: session.id,
      p_player_id:  playerId,
      p_imdb_guess: guess,
    })

    const score  = (!error && data?.score != null) ? data.score : null
    const bonus  = (!error && data?.streak_bonus) ? data.streak_bonus : 0
    setMyScore(score)
    setMyBonus(bonus)
    onGuessSubmitted?.(guess, score)
  }

  // Timer — minimum 3s on screen before auto-submit fires
  // This prevents instant auto-submit if deadline has already passed on mount
  const secondsLeft = useSessionTimer(deadline, () => {
    const timeOnScreen = Date.now() - mountedAtRef.current
    const delay = Math.max(0, 3000 - timeOnScreen)
    setTimeout(() => {
      submitGuess(imdbGuessRef.current)
      onTimerExpired?.()
    }, delay)
  })

  // Host: also trigger reveal 3s after timer hits 0 (catches any remaining submits)
  const timerFiredRef = useRef(false)
  useEffect(() => {
    if (!isHost || secondsLeft !== 0) return
    if (timerFiredRef.current) return
    timerFiredRef.current = true
    const t = setTimeout(() => onTimerExpired?.(), 3000)
    return () => clearTimeout(t)
  }, [secondsLeft, isHost]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!movie) return null

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 animate-fadeUp">

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <RoundDots total={ROUNDS} current={round} />
        <CountdownTimer secondsLeft={secondsLeft} totalSeconds={session.round_seconds} />
        <div className="text-xs text-muted text-right">
          <div className="text-white/60 font-semibold">{submittedCount}/{players.length}</div>
          <div>submitted</div>
        </div>
      </div>

      {/* Movie */}
      <div className="w-full max-w-md mb-6">
        <MoviePoster movie={movie} />
      </div>

      {/* Guess or waiting */}
      {submitted ? (
        <div className="w-full max-w-md bg-surface border border-white/[0.05] rounded-2xl p-6 text-center">
          {myScore !== null && (
            <div className="text-4xl font-black text-accent mb-1">
              {myScore === 100
                ? <span className="text-green-400" style={{ textShadow: '0 0 20px rgba(74,222,128,0.6)' }}>100 ✦</span>
                : `${myScore} pts`}
            </div>
          )}
          {myBonus > 0 && (
            <div className="text-orange-400 font-bold text-sm mb-1 animate-scaleIn">🔥 +{myBonus} streak bonus!</div>
          )}
          <div className="text-muted text-sm">Waiting for others…</div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          <RatingSlider type="imdb" value={imdbGuess} onChange={setImdbGuess} />
          <button
            onClick={() => submitGuess(imdbGuess)}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)] hover:brightness-110 transition-all"
          >
            Submit Guess
          </button>
        </div>
      )}

      <ChatPanel messages={chatMessages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
