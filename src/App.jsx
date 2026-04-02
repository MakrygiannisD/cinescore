import { useReducer, useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { supabase }              from './lib/supabase'
import { scoreRound }            from './lib/scoring'
import { getOrCreatePlayerId, getPlayerName, savePlayerName } from './lib/session'
import { useAuth }               from './hooks/useAuth'
import HomeScreen                from './screens/HomeScreen'
import GameScreen                from './screens/GameScreen'
import RevealScreen              from './screens/RevealScreen'
import FinalScreen               from './screens/FinalScreen'
import LeaderboardScreen         from './screens/LeaderboardScreen'
import SessionLobbyScreen        from './screens/SessionLobbyScreen'
import SessionGameScreen         from './screens/SessionGameScreen'
import SessionRevealScreen       from './screens/SessionRevealScreen'
import SessionResultsScreen      from './screens/SessionResultsScreen'
import NameModal                 from './components/NameModal'

const ROUNDS = 5

const initialState = {
  screen:       'home',
  mode:         null,   // 'base' | 'daily' | 'top-rated' | 'popular' | 'classics' | 'session'
  selectedList: null,
  movies:       [],
  currentRound: 0,
  guesses:      [],
  scores:       [],
  // Session-specific
  sessionId:    null,
  session:      null,   // full session row (status, current_round, round_deadline, etc.)
  sessionPlayers: [],
  isHost:       false,
  myGuess:      null,   // guess for current session round (for reveal screen)
  myScore:      null,
}

function reducer(state, action) {
  switch (action.type) {

    case 'START_GAME':
      return {
        ...initialState,
        screen:       'game',
        mode:         action.mode,
        selectedList: action.list,
        movies:       action.movies,
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

    // ── Session actions ───────────────────────────────────

    case 'SHOW_SESSION_LOBBY':
      return {
        ...initialState,
        screen:         'session-lobby',
        mode:           'session',
        sessionId:      action.sessionId,
        session:        action.session,
        sessionPlayers: action.players || [],
        isHost:         action.isHost,
      }

    case 'SESSION_UPDATE':
      return {
        ...state,
        session: { ...state.session, ...action.session },
      }

    case 'SESSION_UPDATE_PLAYERS':
      return { ...state, sessionPlayers: action.players }

    case 'START_SESSION_GAME':
      return {
        ...state,
        screen:  'session-game',
        movies:  action.movies,
        session: action.session,
        myGuess: null,
        myScore: null,
      }

    case 'SESSION_SHOW_REVEAL':
      return {
        ...state,
        screen:  'session-reveal',
        myGuess: action.myGuess,
        myScore: action.myScore,
        session: { ...state.session, status: 'reveal' },
      }

    case 'SESSION_NEXT_ROUND':
      return {
        ...state,
        screen:  'session-game',
        session: action.session,
        myGuess: null,
        myScore: null,
      }

    case 'SESSION_SHOW_RESULTS':
      return {
        ...state,
        screen:  'session-results',
        session: { ...state.session, status: 'results' },
      }

    default:
      return state
  }
}

export default function App() {
  const [state, dispatch]             = useReducer(reducer, initialState)
  const [showConfirm, setShowConfirm] = useState(false)
  const [dailyTotal, setDailyTotal]   = useState(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [pendingSession, setPendingSession] = useState(null) // {id} waiting for name
  const { user, profile, signInWithGoogle, signOut } = useAuth()

  const playerId    = getOrCreatePlayerId()
  const playerName  = getPlayerName()

  const {
    screen, mode, selectedList, movies, currentRound, guesses, scores,
    sessionId, session, sessionPlayers, isHost, myGuess,
  } = state

  const runningScore = scores.reduce((sum, s) => sum + s.total, 0)

  // Handle incoming session links (?session=abc123)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid    = params.get('session')
    if (!sid) return
    window.history.replaceState({}, '', window.location.pathname)
    joinSession(sid)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function joinSession(sid, name = playerName) {
    if (!name) {
      // Need a name first
      setPendingSession({ id: sid })
      setShowNameModal(true)
      return
    }
    const { data, error } = await supabase.rpc('join_session', {
      p_session_id:   sid,
      p_display_name: name,
      p_player_id:    playerId,
    })
    if (error) { console.error(error.message); return }
    const sess    = data.session
    const players = data.players || []
    dispatch({
      type: 'SHOW_SESSION_LOBBY',
      sessionId: sid,
      session:   sess,
      players,
      isHost:    sess.host_player_id === playerId,
    })
  }

  async function handleCreateSession() {
    const name = playerName
    if (!name) {
      setPendingSession({ create: true })
      setShowNameModal(true)
      return
    }
    const { data: sid, error } = await supabase.rpc('create_session', {
      p_display_name:  name,
      p_player_id:     playerId,
      p_round_seconds: 30,
    })
    if (error || !sid) { console.error(error?.message); return }
    const { data } = await supabase.rpc('join_session', {
      p_session_id:   sid,
      p_display_name: name,
      p_player_id:    playerId,
    })
    dispatch({
      type:      'SHOW_SESSION_LOBBY',
      sessionId: sid,
      session:   data.session,
      players:   data.players || [],
      isHost:    true,
    })
  }

  // Called when Realtime says status='playing' (from lobby or results)
  async function handleSessionStart(sess) {
    const { data: moviesData } = await supabase
      .from('movies')
      .select('*')
      .in('id', sess.movie_ids)
      .order('id')   // we'll re-sort below

    // Sort to match movie_ids order
    const sorted = sess.movie_ids.map((id) => moviesData?.find((m) => m.id === id)).filter(Boolean)

    dispatch({ type: 'START_SESSION_GAME', movies: sorted, session: sess })
  }

  // Called when reveal Realtime gets next session update
  function handleSessionUpdate(sess) {
    if (sess.status === 'playing') {
      dispatch({ type: 'SESSION_NEXT_ROUND', session: sess })
    } else if (sess.status === 'results') {
      dispatch({ type: 'SESSION_SHOW_RESULTS' })
    } else {
      dispatch({ type: 'SESSION_UPDATE', session: sess })
    }
  }

  async function handleStartDaily() {
    const { data, error } = await supabase.rpc('get_daily_movies')
    if (error || !data || data.length < 5) return
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
    } else {
      ;({ data } = await supabase.rpc('get_random_movies', { p_list_id: selectedList.id, p_count: ROUNDS }))
    }
    dispatch({ type: 'PLAY_AGAIN', movies: data ?? [] })
  }

  async function submitDailyScore(total, scoreBreakdown) {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('daily_scores').upsert(
      { user_id: user.id, date: today, scores: scoreBreakdown, total },
      { onConflict: 'user_id,date' }
    )
    setDailyTotal(total)
  }

  const inSessionScreen = screen.startsWith('session-')
  const inGame = !['home', 'leaderboard'].includes(screen) && !inSessionScreen

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">

      {/* Back button (solo game only) */}
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
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all"
              >
                Keep playing
              </button>
              <button
                onClick={() => { setShowConfirm(false); dispatch({ type: 'CHANGE_LIST' }) }}
                className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name modal — for session join/create */}
      {showNameModal && (
        <NameModal
          title="What's your name?"
          placeholder="Enter your name"
          onConfirm={(name) => {
            setShowNameModal(false)
            savePlayerName(name)
            if (pendingSession?.create) {
              handleCreateSession()
            } else if (pendingSession?.id) {
              joinSession(pendingSession.id, name)
            }
            setPendingSession(null)
          }}
        />
      )}

      <div className="w-full max-w-md">

        {screen === 'home' && (
          <HomeScreen
            user={user}
            profile={profile}
            onStartGame={(list, movs) =>
              dispatch({ type: 'START_GAME', mode: list.slug, list, movies: movs })
            }
            onStartDaily={handleStartDaily}
            onStartMultiplayer={handleCreateSession}
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
            isChallenge={false}
            user={user}
            onDailyComplete={submitDailyScore}
            onChallengeComplete={() => {}}
            onPlayAgain={handlePlayAgain}
            onChangeList={() => dispatch({ type: 'CHANGE_LIST' })}
            onShowLeaderboard={() => dispatch({ type: 'SHOW_LEADERBOARD' })}
          />
        )}

        {/* ── Session screens ─────────────────────────────── */}

        {screen === 'session-lobby' && (
          <SessionLobbyScreen
            sessionId={sessionId}
            playerId={playerId}
            displayName={playerName}
            isHost={isHost}
            hostPlayerId={session?.host_player_id}
            initialPlayers={sessionPlayers}
            onStartGame={handleSessionStart}
            onHome={() => dispatch({ type: 'CHANGE_LIST' })}
          />
        )}

        {screen === 'session-game' && (
          <SessionGameScreen
            session={session}
            movies={movies}
            players={sessionPlayers}
            playerId={playerId}
            displayName={playerName}
            isHost={isHost}
            onReveal={({ score, myGuess: guess }) =>
              dispatch({ type: 'SESSION_SHOW_REVEAL', myGuess: guess, myScore: score })
            }
            onGuessInsert={() => {}}
          />
        )}

        {screen === 'session-reveal' && (
          <SessionRevealScreen
            session={session}
            movies={movies}
            players={sessionPlayers}
            playerId={playerId}
            displayName={playerName}
            isHost={isHost}
            myGuess={myGuess}
            onSessionUpdate={handleSessionUpdate}
          />
        )}

        {screen === 'session-results' && (
          <SessionResultsScreen
            session={session}
            movies={movies}
            players={sessionPlayers}
            playerId={playerId}
            displayName={playerName}
            isHost={isHost}
            onNewGame={handleSessionStart}
            onHome={() => dispatch({ type: 'CHANGE_LIST' })}
            onSessionUpdate={handleSessionUpdate}
          />
        )}

      </div>
      <Analytics />
    </div>
  )
}
