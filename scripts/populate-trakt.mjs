import { createClient } from '@supabase/supabase-js'

process.loadEnvFile(new URL('../.env', import.meta.url))

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID
const OMDB_KEY        = process.env.OMDB_KEY

// ── Trakt list to fetch  (from the URL: /users/{user}/lists/{slug}) ──
const TRAKT_USER      = 'justin'
const TRAKT_LIST_SLUG = 'imdb-top-rated-movies'

// ── Which Supabase list to assign movies to ──────────────
const DB_LIST_SLUG    = 'top-rated'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchTraktPage(page) {
  const url = `https://api.trakt.tv/users/${TRAKT_USER}/lists/${TRAKT_LIST_SLUG}/items/movies?page=${page}&limit=100`
  const res = await fetch(url, {
    headers: {
      'Content-Type':      'application/json',
      'trakt-api-version': '2',
      'trakt-api-key':     TRAKT_CLIENT_ID,
      'User-Agent':        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  })
  if (!res.ok) throw new Error(`Trakt error ${res.status}: ${await res.text()}`)
  const totalPages = parseInt(res.headers.get('x-pagination-page-count') || '1')
  const data = await res.json()
  return { data, totalPages }
}

async function fetchOmdb(imdbId) {
  const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    console.log(`  OMDB HTTP ${res.status} for ${imdbId}`)
    return null
  }
  const data = await res.json()
  if (data.Response === 'False') {
    console.log(`  OMDB rejected ${imdbId}: ${data.Error}`)
    return null
  }
  return data
}

function parseRtRating(omdbData) {
  const rt = omdbData.Ratings?.find(r => r.Source === 'Rotten Tomatoes')
  if (!rt) return null
  return parseInt(rt.Value)  // "91%" → 91
}

// ── Step 1: Fetch all movies from Trakt list ──────────────
console.log(`Fetching Trakt list: ${TRAKT_USER}/${TRAKT_LIST_SLUG}`)

const allMovies = []
const { data: firstPage, totalPages } = await fetchTraktPage(1)
allMovies.push(...firstPage)

if (totalPages > 1) {
  for (let page = 2; page <= totalPages; page++) {
    console.log(`  Fetching page ${page}/${totalPages}...`)
    const { data } = await fetchTraktPage(page)
    allMovies.push(...data)
    await sleep(300)
  }
}

console.log(`Found ${allMovies.length} movies on Trakt list`)

// ── Step 2: Fetch ratings from OMDB ──────────────────────
console.log(`Fetching ratings from OMDB (this will take a while)...`)

const rows = []
let skipped = 0

for (let i = 0; i < allMovies.length; i++) {
  const item    = allMovies[i]
  const movie   = item.movie
  const imdbId  = movie.ids?.imdb

  if (!imdbId) { skipped++; continue }

  process.stdout.write(`  [${i + 1}/${allMovies.length}] ${movie.title} (${movie.year})... `)

  const omdb = await fetchOmdb(imdbId)

  if (!omdb) {
    console.log('skipped (no OMDB data)')
    skipped++
    await sleep(200)
    continue
  }

  const imdbRating = parseFloat(omdb.imdbRating)
  const rtRating   = parseRtRating(omdb)
  const poster     = omdb.Poster

  if (!imdbRating || isNaN(imdbRating) || rtRating === null || !poster || poster === 'N/A') {
    console.log(`skipped (missing: imdb=${omdb.imdbRating} rt=${rtRating} poster=${poster === 'N/A' ? 'N/A' : 'ok'})`)
    skipped++
    await sleep(200)
    continue
  }

  console.log(`✓ IMDb ${imdbRating} / RT ${rtRating}%`)

  rows.push({
    imdb_id:     imdbId,
    title:       movie.title,
    year:        movie.year || null,
    genre:       omdb.Genre || null,
    imdb_rating: imdbRating,
    rt_rating:   rtRating,
    poster_url:  poster,
  })

  await sleep(250)  // stay within OMDB free tier rate limit
}

console.log(`\nCollected ${rows.length} movies (skipped ${skipped})`)

if (rows.length === 0) {
  console.error('Nothing to insert.')
  process.exit(1)
}

// ── Step 3: Get target list id ────────────────────────────
const { data: list, error: listErr } = await supabase
  .from('lists')
  .select('id')
  .eq('slug', DB_LIST_SLUG)
  .single()

if (listErr || !list) {
  console.error(`Could not find list "${DB_LIST_SLUG}":`, listErr?.message)
  process.exit(1)
}
console.log(`Using DB list "${DB_LIST_SLUG}" (id: ${list.id})`)

// ── Step 4: Upsert movies ─────────────────────────────────
const { data: inserted, error: moviesErr } = await supabase
  .from('movies')
  .upsert(rows, { onConflict: 'imdb_id' })
  .select('id, imdb_id')

if (moviesErr) {
  console.error('Error inserting movies:', moviesErr.message)
  process.exit(1)
}
console.log(`Upserted ${inserted.length} movies into DB`)

// ── Step 5: Link to list ──────────────────────────────────
const links = inserted.map(m => ({ list_id: list.id, movie_id: m.id }))

const { error: linkErr } = await supabase
  .from('list_movies')
  .upsert(links, { onConflict: 'list_id,movie_id' })

if (linkErr) {
  console.error('Error linking movies to list:', linkErr.message)
  process.exit(1)
}

console.log(`\nDone! ${inserted.length} movies added to "${DB_LIST_SLUG}"`)
