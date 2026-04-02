import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'
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
  displayName,
  isHost,
  onReveal,
}) {
  const [imdbGuess, setImdbGuess]           = useState(5.0)
  const [submitted, setSubmitted]           = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [myScore, setMyScore]               = useState(null)
  const [messages, setMessages]             = useState([])

  // These refs prevent double-firing without blocking the Realtime transition
  const triggeringRef  = useRef(false)  // prevents calling show_session_reveal twice
  const transitionedRef = useRef(false) // prevents calling onReveal twice
  const imdbGuessRef   = useRef(imdbGuess)
  const myScoreRef     = useRef(null)

  const round    = session.current_round
  const movie    = movies[round]
  const deadline = session.round_deadline

  // Keep refs in sync with state for use in async callbacks
  useEffect(() => { imdbGuessRef.current = imdbGuess }, [imdbGuess])
  useEffect(() => { myScoreRef.current   = myScore   }, [myScore])

  // Reset everything when the round number changes
  useEffect(() => {
    setImdbGuess(5.0)
    setSubmitted(false)
    setSubmittedCount(0)
    setMyScore(null)
    triggeringRef.current   = false
    transitionedRef.current = false
    imdbGuessRef.current    = 5.0
    myScoreRef.current      = null
  }, [round])

  async function submitGuess(guess) {
    if (submitted) return
    setSubmitted(true)

    const { data, error } = await supabase.rpc('submit_session_guess', {
      p_session_id: session.id,
      p_player_id:  playerId,
      p_imdb_guess: guess,
    })
    if (!error && data) {
      myScoreRef.current = data.score
      setMyScore(data.score)
    }
  }

  // Host: transition everyone to reveal (called after all submit OR timer grace)
  async function triggerReveal() {
    if (!isHost || triggeringRef.current) return
    triggeringRef.current = true
    // Grace period so late auto-submits can land
    await new Promise((r) => setTimeout(r, 1500))
    await supabase.rpc('show_session_reveal', {
      p_session_id: session.id,
      p_player_id:  playerId,
    })
    // Realtime UPDATE will fire onSessionUpdate → onReveal for ALL clients including host
  }

  // Realtime subscriptions
  const { sendChatMessage } = useSession({
    sessionId: session.id,
    playerId,
    displayName,
    // When DB status becomes 'reveal', ALL clients (including host) move to reveal screen
    onSessionUpdate: (sess) => {
      if (sess.status === 'reveal' && !transitionedRef.current) {
        transitionedRef.current = true
        onReveal({ score: myScoreRef.current, myGuess: imdbGuessRef.current })
      }
    },
    onPlayersUpdate: () => {},
    onGuessInsert: (guess) => {
      setSubmittedCount((c) => c + 1)
      // Host: check if all players have submitted
      if (isHost) {
        supabase
          .from('session_guesses')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('game_number', session.game_number)
          .eq('round', round)
          .then(({ count }) => {
            if (count >= players.length) triggerReveal()
          })
      }
    },
    onChatMessage: (msg) => setMessages((prev) => [...prev, msg]),
  })

  // Auto-submit current slider value when timer expires
  const secondsLeft = useSessionTimer(deadline, () => {
    submitGuess(imdbGuessRef.current)
  })

  // Host: trigger reveal 2s after timer hits 0 (catches players who don't submit)
  useEffect(() => {
    if (!isHost || secondsLeft !== 0) return
    const t = setTimeout(() => triggerReveal(), 2000)
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

      {/* Movie poster */}
      <div className="w-full max-w-md mb-6">
        <MoviePoster movie={movie} />
      </div>

      {/* Guess area */}
      {submitted ? (
        <div className="w-full max-w-md bg-surface border border-white/[0.05] rounded-2xl p-6 text-center">
          {myScore !== null
            ? <div className="text-4xl font-black text-accent mb-1">{myScore} pts</div>
            : null}
          <div className="text-muted text-sm">
            {myScore !== null ? 'Waiting for others…' : 'Guess submitted — waiting…'}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          <RatingSlider type="imdb" value={imdbGuess} onChange={setImdbGuess} />
          <button
            onClick={() => submitGuess(imdbGuess)}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)]
              hover:brightness-110 transition-all"
          >
            Submit Guess
          </button>
        </div>
      )}

      <ChatPanel messages={messages} onSend={sendChatMessage} displayName={displayName} />
    </div>
  )
}
