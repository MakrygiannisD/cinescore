import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGameSetup() {
  const [lists, setLists]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    supabase
      .from('lists')
      .select(`
        id, slug, name, description, emoji,
        list_movies(count)
      `)
      .order('id', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); return }
        setLists(
          (data ?? []).map(l => ({
            ...l,
            movieCount: l.list_movies?.[0]?.count ?? 0,
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [])

  return { lists, loading, error }
}
