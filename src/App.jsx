import { useReducer, useState, useEffect, useRef, useCallback } from 'react'
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
import PlayerStatsScreen         from './screens/PlayerStatsScreen'
import NameModal                 from './components/NameModal'

const ROUNDS = 5

const initialState = {
  screen:         'home',
  mode:           null,
  selectedList:   null,
  movies:         [],
  currentRound:   0,
  guesses:        [],
  scores:         [],
  sessionId:      null,
  session:        null,
  sessionPlayers: [],
  isHost:         false,
  myGuess:        null,
  myScore:        null,
  submittedCount: 0,
}

function reducer(state, action) {
  switch (action.type) {

    case 'START_GAME':
      return { ...initialState, screen: 'game', mode: action.mode, selectedList: action.list, movies: action.movies }

    case 'SUBMIT_GUESS': {
      const movie = state.movies[state.currentRound]
      const score = scoreRound(action.imdb, action.rt, movie.imdb_rating, movie.rt_rating)
      return { ...state, screen: 'reveal', guesses: [...state.guesses, { imdb: action.imdb, rt: action.rt }], scores: [...state.scores, score] }
    }

    case 'NEXT_ROUND': {
      const next = state.currentRound + 1
      return next >= ROUNDS
        ? { ...state, screen: 'final' }
        : { ...state, screen: 'game', currentRound: next }
    }

    case 'PLAY_AGAIN':
      return { ...state, screen: 'game', movies: action.movies, currentRound: 0, guesses: [], scores: [] }

    case 'CHANGE_LIST':
      return { ...initialState }

    case 'SHOW_LEADERBOARD':
      return { ...initialState, screen: 'leaderboard' }

    case 'SHOW_STATS':
      return { ...initialState, screen: 'stats' }

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

    case 'SESSION_UPDATE_PLAYERS':
      return { ...state, sessionPlayers: action.players }

    case 'SESSION_SUBMITTED_COUNT':
      return { ...state, submittedCount: action.count }

    case 'START_SESSION_GAME':
      return {
        ...state,
        screen:         'session-game',
        movies:         action.movies,
        session:        action.session,
        myGuess:        null,
        myScore:        null,
        submittedCount: 0,
      }

    case 'SESSION_SHOW_REVEAL':
      return {
        ...state,
        screen:  'session-reveal',
        myGuess: action.myGuess,
        myScore: action.myScore,
        session: { ...state.session, status: 'reveal', round_deadline: null },
      }

    case 'SESSION_NEXT_ROUND':
      return {
        ...state,
        screen:         'session-game',
        session:        action.session,
        myGuess:        null,
        myScore:        null,
        submittedCount: 0,
      }

    case 'SESSION_SHOW_RESULTS':
      return { ...state, screen: 'session-results', session: { ...state.session, status: 'results' } }

    case 'SESSION_UPDATE':
      return { ...state, session: { ...state.session, ...action.session } }

    case 'SESSION_GUESS_INSERTED':
      return { ...state, submittedCount: state.submittedCount + 1 }

    default:
      return state
  }
}

export default function App() {
  const [state, dispatch]             = useReducer(reducer, initialState)
  const [showConfirm, setShowConfirm] = useState(false)
  const [dailyTotal, setDailyTotal]   = useState(null)
  const [showNameModal, setShowNameModal]   = useState(false)
  const [pendingSession, setPendingSession] = useState(null)
  const [chatMessages, setChatMessages]     = useState([])
  const [reactions, setReactions]           = useState([])
  const { user, profile, signInWithGoogle, signOut } = useAuth()

  const playerId   = getOrCreatePlayerId()
  const playerName = getPlayerName()

  const {
    screen, mode, selectedList, movies, currentRound, guesses, scores,
    sessionId, session, sessionPlayers, isHost, myGuess, submittedCount,
  } = state

  const runningScore = scores.reduce((sum, s) => sum + s.total, 0)

  const channelRef  = useRef(null)
  // Stable refs for guess tracking — updated by SessionGameScreen callbacks
  const myGuessRef  = useRef(5.0)
  const myScoreRef  = useRef(null)
  const isHostRef   = useRef(isHost)
  useEffect(() => { isHostRef.current = isHost }, [isHost])

  // ── Single persistent Realtime channel — only syncs raw data into state ──
  useEffect(() => {
    if (!sessionId) return

    setChatMessages([])

    // Initial player fetch
    supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at')
      .then(({ data }) => { if (data) dispatch({ type: 'SESSION_UPDATE_PLAYERS', players: data }) })

    const channel = supabase.channel(`session:${sessionId}`)

    // sessions UPDATE — just store the new row; a separate useEffect drives transitions
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
      (payload) => dispatch({ type: 'SESSION_UPDATE', session: payload.new })
    )

    // session_players — refetch full list on any change; detect kick
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
      () => supabase
        .from('session_players').select('*').eq('session_id', sessionId).order('joined_at')
        .then(({ data }) => {
          if (!data) return
          // If current player is no longer in the list, they were kicked
          if (!data.find((p) => p.player_id === playerId)) {
            dispatch({ type: 'CHANGE_LIST' })
            return
          }
          dispatch({ type: 'SESSION_UPDATE_PLAYERS', players: data })
        })
    )

    // session_guesses INSERT — update submitted count
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'session_guesses', filter: `session_id=eq.${sessionId}` },
      () => dispatch({ type: 'SESSION_GUESS_INSERTED' })  // handled below
    )

    // Broadcast: chat
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      setChatMessages((prev) => [...prev, payload])
    })

    // Broadcast: reactions
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const uid = Math.random().toString(36).slice(2)
      setReactions((prev) => [...prev, { ...payload, uid }])
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.uid !== uid)), 2600)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Transition useEffect: reacts to session.status changes from DB ──
  // Runs with fresh `screen` value — no stale-closure problem
  useEffect(() => {
    if (!session || !screen.startsWith('session-')) return

    const { status } = session

    if (status === 'playing') {
      if (screen === 'session-lobby' || screen === 'session-results') {
        // New game starting — fetch movies then go to game
        supabase
          .from('movies').select('*').in('id', session.movie_ids)
          .then(({ data }) => {
            const sorted = session.movie_ids
              .map((id) => data?.find((m) => m.id === id))
              .filter(Boolean)
            dispatch({ type: 'START_SESSION_GAME', movies: sorted, session })
          })
      } else if (screen === 'session-reveal') {
        // Next round — movies already loaded
        dispatch({ type: 'SESSION_NEXT_ROUND', session })
      }
      // screen === 'session-game': already in game, ignore
    } else if (status === 'reveal' && screen === 'session-game') {
      dispatch({
        type:    'SESSION_SHOW_REVEAL',
        myGuess: myGuessRef.current,
        myScore: myScoreRef.current,
      })
    } else if (status === 'results' && screen !== 'session-results') {
      dispatch({ type: 'SESSION_SHOW_RESULTS' })
    }
  }, [session?.status, session?.current_round, session?.game_number]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling fallback — catches Realtime misses on reveal screen ──
  // Non-host clients poll the DB every 2s while on reveal screen.
  // If status changed but Realtime didn't fire, the transition effect above will run.
  useEffect(() => {
    if (screen !== 'session-reveal' || !sessionId) return
    const id = setInterval(async () => {
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (data) dispatch({ type: 'SESSION_UPDATE', session: data })
    }, 2000)
    return () => clearInterval(id)
  }, [screen, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Host: trigger reveal when all players submitted ──
  const triggerRevealRef = useRef(false)
  useEffect(() => {
    if (!isHost || screen !== 'session-game') return
    if (submittedCount > 0 && submittedCount >= sessionPlayers.length) {
      if (!triggerRevealRef.current) {
        triggerRevealRef.current = true
        setTimeout(async () => {
          await supabase.rpc('show_session_reveal', { p_session_id: sessionId, p_player_id: playerId })
          triggerRevealRef.current = false
        }, 1500) // grace for late submits
      }
    }
  }, [submittedCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset reveal guard when round changes
  useEffect(() => {
    triggerRevealRef.current = false
  }, [session?.current_round])

  // Chat: send and immediately show own message
  const sendChatMessage = useCallback(async (body) => {
    const msg = {
      player_id:    playerId,
      display_name: playerName,
      body,
      created_at:   new Date().toISOString(),
    }
    // Optimistic: add to own list immediately
    setChatMessages((prev) => [...prev, msg])
    // Broadcast to others
    channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: msg })
    // Persist to DB
    await supabase.rpc('send_session_message', {
      p_session_id:   sessionId,
      p_player_id:    playerId,
      p_display_name: playerName,
      p_body:         body,
    })
  }, [sessionId, playerId, playerName])

  async function handleKickPlayer(targetPlayerId) {
    await supabase
      .from('session_players')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', targetPlayerId)
  }

  const sendReaction = useCallback((emoji) => {
    const payload = { emoji, x: 20 + Math.random() * 60 }
    // Show locally too (broadcast doesn't echo to sender)
    const uid = Math.random().toString(36).slice(2)
    setReactions((prev) => [...prev, { ...payload, uid }])
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.uid !== uid)), 2600)
    channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload })
  }, [])

  // Called by SessionGameScreen when player submits a guess
  function onGuessSubmitted(guess, score) {
    myGuessRef.current = guess
    myScoreRef.current = score
  }

  // Called by SessionGameScreen when timer expires (host drives reveal)
  function onTimerExpired() {
    if (!isHost || triggerRevealRef.current) return
    triggerRevealRef.current = true
    setTimeout(async () => {
      const { error } = await supabase.rpc('show_session_reveal', { p_session_id: sessionId, p_player_id: playerId })
      if (error) console.error('show_session_reveal failed:', error)
      triggerRevealRef.current = false
      // Force-sync in case Realtime is slow
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (data) dispatch({ type: 'SESSION_UPDATE', session: data })
    }, 1500)
  }

  // Called by SessionRevealScreen host countdown — advances round or ends game
  async function handleAdvanceRound() {
    const { error } = await supabase.rpc('advance_session_round', {
      p_session_id: sessionId,
      p_player_id:  playerId,
    })
    if (error) { console.error('advance_session_round failed:', error); return }
    // Force-sync so transition happens even if Realtime is delayed
    const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (data) dispatch({ type: 'SESSION_UPDATE', session: data })
  }

  // URL param: join via link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid    = params.get('session')
    if (!sid) return
    window.history.replaceState({}, '', window.location.pathname)
    joinSession(sid)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function joinSession(sid, name = playerName) {
    if (!name) { setPendingSession({ id: sid }); setShowNameModal(true); return }
    const { data, error } = await supabase.rpc('join_session', {
      p_session_id: sid, p_display_name: name, p_player_id: playerId,
    })
    if (error) throw new Error(error.message)

    const sess = data.session

    // If joining mid-results, load movies and drop straight into results screen
    if (sess.status === 'results' && sess.movie_ids?.length) {
      const { data: movieRows } = await supabase.from('movies').select('*').in('id', sess.movie_ids)
      const sorted = sess.movie_ids.map((id) => movieRows?.find((m) => m.id === id)).filter(Boolean)
      dispatch({
        type: 'SHOW_SESSION_LOBBY',
        sessionId: sid,
        session:   sess,
        players:   data.players || [],
        isHost:    sess.host_player_id === playerId,
      })
      dispatch({ type: 'START_SESSION_GAME', movies: sorted, session: sess })
      dispatch({ type: 'SESSION_SHOW_RESULTS' })
      return
    }

    dispatch({
      type: 'SHOW_SESSION_LOBBY',
      sessionId: sid,
      session:   sess,
      players:   data.players || [],
      isHost:    sess.host_player_id === playerId,
    })
  }

  async function handleCreateSession() {
    const name = playerName
    if (!name) { setPendingSession({ create: true }); setShowNameModal(true); return }
    const { data: sid, error } = await supabase.rpc('create_session', {
      p_display_name: name, p_player_id: playerId, p_round_seconds: 30,
    })
    if (error || !sid) { console.error(error?.message); return }
    const { data } = await supabase.rpc('join_session', {
      p_session_id: sid, p_display_name: name, p_player_id: playerId,
    })
    dispatch({
      type: 'SHOW_SESSION_LOBBY',
      sessionId: sid,
      session:   data.session,
      players:   data.players || [],
      isHost:    true,
    })
  }

  async function handleStartDaily() {
    const { data, error } = await supabase.rpc('get_daily_movies')
    if (error || !data || data.length < 5) return
    dispatch({ type: 'START_GAME', mode: 'daily', list: { id: null, slug: 'daily', name: 'Daily Quiz' }, movies: data })
  }

  async function handlePlayAgain() {
    let data
    if (mode === 'daily')        ({ data } = await supabase.rpc('get_daily_movies'))
    else if (mode === 'base')    ({ data } = await supabase.rpc('get_base_game_movies'))
    else if (mode === 'classics')({ data } = await supabase.rpc('get_classics_movies', { p_count: ROUNDS }))
    else                         ({ data } = await supabase.rpc('get_random_movies', { p_list_id: selectedList.id, p_count: ROUNDS }))
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

      {inGame && (
        <button
          onClick={() => setShowConfirm(true)}
          className="fixed top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-muted text-sm font-medium hover:text-white hover:border-accent/40 transition-all active:scale-95"
        >
          ← Home
        </button>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-fadeUp">
            <div className="text-center">
              <div className="text-xl font-bold mb-1">Quit game?</div>
              <div className="text-muted text-sm">Your progress will be lost.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all">Keep playing</button>
              <button onClick={() => { setShowConfirm(false); dispatch({ type: 'CHANGE_LIST' }) }} className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all">Quit</button>
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <NameModal
          title="What's your name?"
          placeholder="Enter your name"
          onConfirm={(name) => {
            setShowNameModal(false)
            savePlayerName(name)
            if (pendingSession?.create)    handleCreateSession()
            else if (pendingSession?.id)   joinSession(pendingSession.id, name)
            setPendingSession(null)
          }}
        />
      )}

      <div className="w-full max-w-md">

        {screen === 'home' && (
          <HomeScreen
            user={user} profile={profile}
            onStartGame={(list, movs) => dispatch({ type: 'START_GAME', mode: list.slug, list, movies: movs })}
            onStartDaily={handleStartDaily}
            onStartMultiplayer={handleCreateSession}
            onJoinSession={joinSession}
            onShowLeaderboard={() => dispatch({ type: 'SHOW_LEADERBOARD' })}
            onShowStats={() => dispatch({ type: 'SHOW_STATS' })}
            onSignIn={signInWithGoogle}
            onSignOut={signOut}
          />
        )}

        {screen === 'leaderboard' && (
          <LeaderboardScreen user={user} userTotal={dailyTotal} onClose={() => dispatch({ type: 'CHANGE_LIST' })} />
        )}

        {screen === 'stats' && (
          <PlayerStatsScreen onClose={() => dispatch({ type: 'CHANGE_LIST' })} />
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
            movies={movies} scores={scores} listName={selectedList?.name}
            isDaily={mode === 'daily'} isChallenge={false} user={user}
            onDailyComplete={submitDailyScore} onChallengeComplete={() => {}}
            onPlayAgain={handlePlayAgain}
            onChangeList={() => dispatch({ type: 'CHANGE_LIST' })}
            onShowLeaderboard={() => dispatch({ type: 'SHOW_LEADERBOARD' })}
          />
        )}

        {screen === 'session-lobby' && (
          <SessionLobbyScreen
            sessionId={sessionId}
            session={session}
            playerId={playerId}
            displayName={playerName}
            isHost={isHost}
            hostPlayerId={session?.host_player_id}
            players={sessionPlayers}
            chatMessages={chatMessages}
            sendChatMessage={sendChatMessage}
            onKick={handleKickPlayer}
            onHome={() => dispatch({ type: 'CHANGE_LIST' })}
          />
        )}

        {screen === 'session-game' && (
          <SessionGameScreen
            key={`${session?.game_number}-${session?.current_round}`}
            session={session}
            movies={movies}
            players={sessionPlayers}
            playerId={playerId}
            displayName={playerName}
            isHost={isHost}
            submittedCount={submittedCount}
            chatMessages={chatMessages}
            sendChatMessage={sendChatMessage}
            onGuessSubmitted={onGuessSubmitted}
            onTimerExpired={onTimerExpired}
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
            chatMessages={chatMessages}
            sendChatMessage={sendChatMessage}
            onAdvanceRound={handleAdvanceRound}
            reactions={reactions}
            sendReaction={sendReaction}
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
            chatMessages={chatMessages}
            sendChatMessage={sendChatMessage}
            onKick={handleKickPlayer}
            onHome={() => dispatch({ type: 'CHANGE_LIST' })}
          />
        )}

      </div>
      <Analytics />
    </div>
  )
}
