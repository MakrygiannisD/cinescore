import { useReducer, useState } from 'react'
import { supabase }   from './lib/supabase'
import { scoreRound } from './lib/scoring'
import HomeScreen   from './screens/HomeScreen'
import GameScreen   from './screens/GameScreen'
import RevealScreen from './screens/RevealScreen'
import FinalScreen  from './screens/FinalScreen'

const ROUNDS = 5

const initialState = {
  screen:       'home',     // 'home' | 'game' | 'reveal' | 'final'
  selectedList: null,
  movies:       [],
  currentRound: 0,
  guesses:      [],         // [{ imdb, rt }, ...]
  scores:       [],         // [{ imdbPts, rtPts, total }, ...]
}

function reducer(state, action) {
  switch (action.type) {

    case 'START_GAME':
      return {
        ...initialState,
        screen:       'game',
        selectedList: action.list,
        movies:       action.movies,
      }

    case 'SUBMIT_GUESS': {
      const movie  = state.movies[state.currentRound]
      const score  = scoreRound(action.imdb, action.rt, movie.imdb_rating, movie.rt_rating)
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

    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [showConfirm, setShowConfirm] = useState(false)

  const { screen, selectedList, movies, currentRound, guesses, scores } = state
  const runningScore = scores.reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">

      {/* Back to home button */}
      {screen !== 'home' && (
        <button
          onClick={() => setShowConfirm(true)}
          className="fixed top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-muted text-sm font-medium hover:text-white hover:border-accent/40 transition-all active:scale-95"
        >
          ← Home
        </button>
      )}

      {/* Quit confirmation modal */}
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
                className="flex-1 py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95"
              >
                Keep playing
              </button>
              <button
                onClick={() => { setShowConfirm(false); dispatch({ type: 'CHANGE_LIST' }) }}
                className="flex-1 py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">

        {screen === 'home' && (
          <HomeScreen
            onStartGame={(list, movies) =>
              dispatch({ type: 'START_GAME', list, movies })
            }
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
            onPlayAgain={async () => {
              const { data } = await supabase.rpc('get_random_movies', {
                p_list_id: selectedList.id,
                p_count:   ROUNDS,
              })
              dispatch({ type: 'PLAY_AGAIN', movies: data ?? [] })
            }}
            onChangeList={() => dispatch({ type: 'CHANGE_LIST' })}
          />
        )}

      </div>
    </div>
  )
}
