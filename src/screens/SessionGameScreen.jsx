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
  onReveal,          // called with { score, myGuess } when transitioning to reveal
  onGuessInsert,
  onChat,
}) {
  const [imdbGuess, setImdbGuess]     = useState(5.0)
  const [submitted, setSubmitted]     = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [myScore, setMyScore]         = useState(null)
  const [messages, setMessages]       = useState([])
  const autoSubmittedRef              = useRef(false)
  const revealCalledRef               = useRef(false)

  const round    = session.current_round
  const movie    = movies[round]
  const deadline = session.round_deadline

  // Reset state when round changes
  useEffect(() => {
    setImdbGuess(5.0)
    setSubmitted(false)
    setSubmittedCount(0)
    setMyScore(null)
    autoSubmittedRef.current  = false
    revealCalledRef.current   = false
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
      setMyScore(data.score)
    }
  }

  // Auto-submit when timer expires
  const handleExpire = useRef(() => {
    if (!autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      submitGuess(imdbGuess)
    }
  })
  useEffect(() => {
    handleExpire.current = () => {
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true
        submitGuess(imdbGuess)
      }
    }
  })

  const secondsLeft = useSessionTimer(deadline, () => handleExpire.current())

  // Realtime: count guesses, host triggers reveal
  const { sendChatMessage } = useSession({
    sessionId: session.id,
    playerId,
    displayName,
    onSessionUpdate: (sess) => {
      if (sess.status === 'reveal' && !revealCalledRef.current) {
        revealCalledRef.current = true
        onReveal({ score: myScore, myGuess: imdbGuess })
      }
    },
    onPlayersUpdate: () => {},
    onGuessInsert: (guess) => {
      setSubmittedCount((c) => c + 1)
      // Host: if all submitted, transition to reveal
      if (isHost) {
        supabase
          .from('session_guesses')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('game_number', session.game_number)
          .eq('round', round)
          .then(({ count }) => {
            if (count >= players.length && !revealCalledRef.current) {
              triggerReveal()
            }
          })
      }
    },
    onChatMessage: (msg) => {
      setMessages((prev) => [...prev, msg])
      onChat?.(msg)
    },
  })

  async function triggerReveal() {
    if (revealCalledRef.current) return
    revealCalledRef.current = true
    // Small grace window for late submits
    await new Promise((r) => setTimeout(r, 1500))
    await supabase.rpc('show_session_reveal', {
      p_session_id: session.id,
      p_player_id:  playerId,
    })
  }

  // Host: trigger reveal when timer + grace expires
  useEffect(() => {
    if (!isHost || secondsLeft !== 0) return
    const t = setTimeout(() => {
      if (!revealCalledRef.current) triggerReveal()
    }, 2000)
    return () => clearTimeout(t)
  }, [secondsLeft, isHost])

  if (!movie) return null

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 animate-fadeUp">

      {/* Header row */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <RoundDots total={ROUNDS} current={round} />
        </div>
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

      {/* Guess or waiting */}
      {submitted ? (
        <div className="w-full max-w-md bg-surface border border-white/[0.05] rounded-2xl p-6 text-center">
          {myScore !== null && (
            <div className="text-4xl font-black text-accent mb-1">{myScore}</div>
          )}
          <div className="text-muted text-sm">
            {myScore !== null ? 'pts — waiting for others…' : 'Guess submitted — waiting…'}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          <RatingSlider
            type="imdb"
            value={imdbGuess}
            onChange={setImdbGuess}
          />
          <button
            onClick={() => submitGuess(imdbGuess)}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-accent text-white
              shadow-[0_4px_24px_rgba(99,102,241,0.35)]
              hover:shadow-[0_4px_32px_rgba(99,102,241,0.5)] hover:brightness-110
              transition-all duration-200"
          >
            Submit Guess
          </button>
        </div>
      )}

      <ChatPanel
        messages={messages}
        onSend={sendChatMessage}
        displayName={displayName}
      />
    </div>
  )
}
