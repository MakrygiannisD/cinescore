import { useReducer, useState, useEffect } from 'react'
import { supabase }              from './lib/supabase'
import { scoreRound }            from './lib/scoring'
import { useAuth }               from './hooks/useAuth'
import HomeScreen                from './screens/HomeScreen'
import GameScreen                from './screens/GameScreen'
import RevealScreen              from './screens/RevealScreen'
import FinalScreen               from './screens/FinalScreen'
import LeaderboardScreen         from './screens/LeaderboardScreen'
import ChallengeResultScreen     from './screens/ChallengeResultScreen'
import NameModal                 from './components/NameModal'

const ROUNDS = 5

const initialState = {
  screen:       'home',
  mode:         null,       // 'base' | 'daily' | 'challenge' | 'top-rated' | 'popular' | 'classics'
  selectedList: null,
  movies:       [],
  currentRound: 0,
  guesses:      [],
  scores:       [],
  challengeId:  null,
}

function reducer(state, action) {
  switch (action.type) {

    case 'START_GAME':
      return {
        ...initialState,
        screen:      'game',
        mode:        action.mode,
        selectedList: action.list,
        movies:      action.movies,
        challengeId: action.challengeId ?? null,
      }

    case 'SUBMIT_GUESS': {
      const movie = state.movies[state.currentRound]
      const score = scoreRound(action.imdb, action.rt, movie.imdb_rating, movie.rt_rating)
      return {
        ...state,
        screen:  'reveal',
        guesses: [...state.guesses, { imdb: action.imdb, rt: action.rt }],
        scores:  [...state.scores, score],
      }
    }

    case 'NEXT_ROUND': {
      const next = state.currentRound + 1
      return next >= ROUNDS
        ? { ...state, screen: 'final' }
        : { ...state, screen: 'game', currentRound: next }
    }

    case 'PLAY_AGAIN':
      return {
        ...state,
        screen:       'game',
        movies:       action.movies,
        currentRound: 0,
        guesses:      [],
        scores:       [],
      }

    case 'CHANGE_LIST':
      return { ...initialState }

    case 'SHOW_LEADERBOARD':
      return { ...initialState, screen: 'leaderboard' }

    case 'SHOW_CHALLENGE_RESULT':
      return { ...state, screen: 'challenge-result' }

    default:
      return state
  }
}

export default function App() {
  const [state, dispatch]           = useReducer(reducer, initialState)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [dailyTotal, setDailyTotal]       = useState(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [playerName, setPlayerName]       = useState(() => localStorage.getItem('cinescore_name') ?? '')
  const { user, profile, signInWithGoogle, signOut } = useAuth()

  const { screen, mode, selectedList, movies, currentRound, guesses, scores, challengeId } = state
  const runningScore = scores.reduce((sum, s) => sum + s.total, 0)
  const finalTotal   = scores.reduce((sum, s) => sum + s.total, 0)

  // Handle incoming challenge links (?challenge=abc123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid    = params.get('challenge')
    if (!cid) return
    // Clear the URL param without reload
    window.history.replaceState({}, '', window.location.pathname)
    loadChallenge(cid)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChallenge(cid) {
    const { data, error } = await supabase.rpc('get_challenge_movies', { p_id: cid })
    if (error || !data || data.length < 5) return
    dispatch({ type: 'START_GAME', mode: 'challenge', list: { id: null, slug: 'challenge', name: '1v1 Challenge' }, movies: data, challengeId: cid })
  }

  async function handleStartChallenge() {
    // Create a new challenge, then start game
    const { data: cid, error } = await supabase.rpc('create_challenge')
    if (error || !cid) return
    const { data: movies } = await supabase.rpc('get_challenge_movies', { p_id: cid })
    if (!movies || movies.length < 5) return
    dispatch({ type: 'START_GAME', mode: 'challenge', list: { id: null, slug: 'challenge', name: '1v1 Challenge' }, movies, challengeId: cid })
  }

  async function handleStartDaily() {
    const { data, error } = await supabase.rpc('get_daily_movies')
    if (error) { console.error('Daily quiz error:', error.message); return }
    if (!data || data.length < 5) { console.error('Not enough daily movies:', data?.length); return }
    dispatch({ type: 'START_GAME', mode: 'daily', list: { id: null, slug: 'daily', name: 'Daily Quiz' }, movies: data })
  }

  async function handlePlayAgain() {
    let data
    if (mode === 'daily') {
      ;({ data } = await supabase.rpc('get_daily_movies'))
    } else if (mode === 'base') {
      ;({ data } = await supabase.rpc('get_base_game_movies'))
    } else if (mode === 'classics') {
      ;({ data } = await supabase.rpc('get_classics_movies', { p_count: ROUNDS }))
    } else if (mode === 'challenge') {
      await handleStartChallenge(); return
    } else {
      ;({ data } = await supabase.rpc('get_random_movies', { p_list_id: selectedList.id, p_count: ROUNDS }))
    }
    dispatch({ type: 'PLAY_AGAIN', movies: data ?? [] })
  }

  async function submitDailyScore(total, scoreBreakdown) {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('daily_scores').upsert({
      user_id: user.id,
      date:    today,
      scores:  scoreBreakdown,
      total,
    }, { onConflict: 'user_id,date' })
    setDailyTotal(total)
  }

  async function submitChallengeScore(name, total, scoreBreakdown) {
    localStorage.setItem('cinescore_name', name)
    setPlayerName(name)
    await supabase.from('challenge_scores').insert({
      challenge_id: challengeId,
      display_name: name,
      scores:       scoreBreakdown,
      total,
    })
    dispatch({ type: 'SHOW_CHALLENGE_RESULT' })
  }

  // When challenge game ends, ask for name if needed
  function handleChallengeFinish(total, scoreBreakdown) {
    if (playerName) {
      submitChallengeScore(playerName, total, scoreBreakdown)
    } else {
      setShowNameModal(true)
    }
  }

  const inGame = screen !== 'home' && screen !== 'leaderboard' && screen !== 'challenge-result'

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">

      {/* Back button */}
      {inGame && (
        <button
          onClick={() => setShowConfirm(true)}
          className="fixed top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-muted text-sm font-medium hover:text-white hover:border-accent/40 transition-all active:scale-95"
        >
          ← Home
        </button>
      )}

      {/* Quit modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-fadeUp">
            <div className="text-center">
              <div className="text-xl font-bold mb-1">Quit game?</div>
              <div className="text-muted text-sm">Your progress will be lost.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95">
                Keep playing
              </button>
              <button onClick={() => { setShowConfirm(false); dispatch({ type: 'CHANGE_LIST' }) }} className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all">
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name modal for challenge */}
      {showNameModal && (
        <NameModal
          title="What's your name?"
          onConfirm={name => {
            setShowNameModal(false)
            submitChallengeScore(name, finalTotal, scores)
          }}
        />
      )}

      <div className="w-full max-w-md">

        {screen === 'home' && (
          <HomeScreen
            user={user}
            profile={profile}
            onStartGame={(list, movies) =>
              dispatch({ type: 'START_GAME', mode: list.slug, list, movies })
            }
            onStartDaily={handleStartDaily}
            onStartChallenge={handleStartChallenge}
            onShowLeaderboard={() => dispatch({ type: 'SHOW_LEADERBOARD' })}
            onSignIn={signInWithGoogle}
            onSignOut={signOut}
          />
        )}

        {screen === 'leaderboard' && (
          <LeaderboardScreen
            user={user}
            userTotal={dailyTotal}
            onClose={() => dispatch({ type: 'CHANGE_LIST' })}
          />
        )}

        {screen === 'challenge-result' && (
          <ChallengeResultScreen
            challengeId={challengeId}
            myName={playerName}
            myTotal={finalTotal}
            movies={movies}
            onPlayAgain={handleStartChallenge}
            onHome={() => dispatch({ type: 'CHANGE_LIST' })}
          />
        )}

        {screen === 'game' && (
          <GameScreen
            key={currentRound}
            movie={movies[currentRound]}
            round={currentRound}
            totalRounds={ROUNDS}
            runningScore={runningScore}
            onSubmit={(imdb, rt) => dispatch({ type: 'SUBMIT_GUESS', imdb, rt })}
          />
        )}

        {screen === 'reveal' && (
          <RevealScreen
            movie={movies[currentRound]}
            imdbGuess={guesses[currentRound].imdb}
            score={scores[currentRound]}
            round={currentRound}
            totalRounds={ROUNDS}
            isLastRound={currentRound === ROUNDS - 1}
            onNext={() => dispatch({ type: 'NEXT_ROUND' })}
          />
        )}

        {screen === 'final' && (
          <FinalScreen
            movies={movies}
            scores={scores}
            listName={selectedList?.name}
            isDaily={mode === 'daily'}
            isChallenge={mode === 'challenge'}
            user={user}
            onDailyComplete={submitDailyScore}
            onChallengeComplete={handleChallengeFinish}
            onPlayAgain={handlePlayAgain}
            onChangeList={() => dispatch({ type: 'CHANGE_LIST' })}
            onShowLeaderboard={() => dispatch({ type: 'SHOW_LEADERBOARD' })}
          />
        )}

      </div>
    </div>
  )
}
