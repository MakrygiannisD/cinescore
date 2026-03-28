import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'

process.loadEnvFile(new URL('../.env', import.meta.url))

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY
const LIST_SLUG     = 'popular'   // which list to assign these movies to

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Load movies.json ──────────────────────────────────────
const raw    = readFileSync('./movies.json', 'utf8')
const movies = JSON.parse(raw)

console.log(`Loaded ${movies.length} movies from movies.json`)

// ── Get the list id ───────────────────────────────────────
const { data: list, error: listErr } = await supabase
  .from('lists')
  .select('id')
  .eq('slug', LIST_SLUG)
  .single()

if (listErr || !list) {
  console.error('Could not find list:', LIST_SLUG, listErr?.message)
  process.exit(1)
}
console.log(`Using list "${LIST_SLUG}" (id: ${list.id})`)

// ── Upsert movies ─────────────────────────────────────────
const rows = movies.map(m => ({
  imdb_id:     m.imdbId,
  title:       m.title,
  year:        parseInt(m.year) || null,
  genre:       m.genre || null,
  imdb_rating: m.imdbRating,
  rt_rating:   m.rtRating,
  poster_url:  m.poster,
}))

const { data: inserted, error: moviesErr } = await supabase
  .from('movies')
  .upsert(rows, { onConflict: 'imdb_id' })
  .select('id, imdb_id')

if (moviesErr) {
  console.error('Error inserting movies:', moviesErr.message)
  process.exit(1)
}
console.log(`Upserted ${inserted.length} movies`)

// ── Link movies to list ───────────────────────────────────
const links = inserted.map(m => ({
  list_id:  list.id,
  movie_id: m.id,
}))

const { error: linkErr } = await supabase
  .from('list_movies')
  .upsert(links, { onConflict: 'list_id,movie_id' })

if (linkErr) {
  console.error('Error linking movies to list:', linkErr.message)
  process.exit(1)
}

console.log(`Done! ${inserted.length} movies linked to "${LIST_SLUG}"`)
