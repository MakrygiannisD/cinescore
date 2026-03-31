import { createClient } from '@supabase/supabase-js'

process.loadEnvFile(new URL('../.env', import.meta.url))

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID
const OMDB_KEY        = process.env.OMDB_KEY

// ── Trakt lists to fetch ──────────────────────────────────
// Duplicates handled automatically (upsert on imdb_id).
const TRAKT_LISTS = [
  { user: 'justin',   slug: 'imdb-top-rated-movies' },
  { user: 'justin',   slug: 'imdb-popular-movies' },
  { user: 'xilfneps', slug: 'all-of-these-films-are-worth-seeing-1400-titles' },
  { user: 'sp1ti',    slug: '1001-movies-you-must-see-before-you-die' },
  { user: 'giladg',   slug: 'the-best-movie-you-never-saw' },
]

// ── Category rules — purely data-driven ──────────────────
const genre   = o => o.Genre?.toLowerCase()    ?? ''
const plot    = o => o.Plot?.toLowerCase()     ?? ''
const title   = o => o.Title?.toLowerCase()    ?? ''
const lang    = o => o.Language?.toLowerCase() ?? ''
const awards  = o => o.Awards?.toLowerCase()   ?? ''
const year    = o => parseInt(o.Year)          || 0
const votes   = o => parseInt(String(o.imdbVotes ?? '').replace(/,/g, '')) || 0
const rating  = o => parseFloat(o.imdbRating)  || 0
const rt      = o => parseInt((o.Ratings?.find(r => r.Source === 'Rotten Tomatoes')?.Value) ?? '0') || 0
const meta    = o => parseInt(o.Metascore)     || 0
const runtime = o => parseInt(String(o.Runtime ?? '').match(/(\d+)/)?.[1] ?? '0') || 0

const CATEGORY_RULES = [
  // Ratings-based
  { slug: 'top-rated',            test: o => rating(o) >= 8.0 },
  { slug: 'popular',              test: o => votes(o) >= 200000 },
  { slug: 'critically-acclaimed', test: o => meta(o) >= 80 || rt(o) >= 90 },
  // Decades
  { slug: '50s-classics', test: o => year(o) >= 1950 && year(o) <= 1959 },
  { slug: '60s-classics', test: o => year(o) >= 1960 && year(o) <= 1969 },
  { slug: '70s-classics', test: o => year(o) >= 1970 && year(o) <= 1979 },
  { slug: '80s-classics', test: o => year(o) >= 1980 && year(o) <= 1989 },
  { slug: '90s-classics', test: o => year(o) >= 1990 && year(o) <= 1999 },
  { slug: '2000s-hits',   test: o => year(o) >= 2000 && year(o) <= 2009 },
  { slug: '2010s-hits',   test: o => year(o) >= 2010 && year(o) <= 2019 },
  { slug: '2020s-hits',   test: o => year(o) >= 2020 },
  // Genres
  { slug: 'action',      test: o => genre(o).includes('action') },
  { slug: 'comedy',      test: o => genre(o).includes('comedy') },
  { slug: 'drama',       test: o => genre(o).includes('drama') },
  { slug: 'thriller',    test: o => genre(o).includes('thriller') },
  { slug: 'crime',       test: o => genre(o).includes('crime') },
  { slug: 'horror',      test: o => genre(o).includes('horror') },
  { slug: 'sci-fi',      test: o => genre(o).includes('sci-fi') },
  { slug: 'animation',   test: o => genre(o).includes('animation') },
  { slug: 'romance',     test: o => genre(o).includes('romance') },
  { slug: 'war',         test: o => genre(o).includes('war') },
  { slug: 'western',     test: o => genre(o).includes('western') },
  { slug: 'mystery',     test: o => genre(o).includes('mystery') },
  { slug: 'documentary', test: o => genre(o).includes('documentary') },
  { slug: 'biography',   test: o => genre(o).includes('biography') || genre(o).includes('biogr') },
  { slug: 'musical',     test: o => genre(o).includes('musical') || genre(o).includes('music') },
  { slug: 'fantasy',     test: o => genre(o).includes('fantasy') },
  { slug: 'adventure',   test: o => genre(o).includes('adventure') },
  { slug: 'family',      test: o => genre(o).includes('family') },
  { slug: 'sport',       test: o => genre(o).includes('sport') },
  // Language
  { slug: 'korean-cinema',    test: o => lang(o).includes('korean') },
  { slug: 'foreign-language', test: o => !lang(o).startsWith('english') },
  // Awards
  { slug: 'oscar-winners', test: o => /won \d+ oscar/i.test(awards(o)) },
  // Special
  {
    slug: 'superhero',
    test: o => genre(o).includes('action') && (
      plot(o).includes('superhero')        ||
      plot(o).includes('marvel')           ||
      title(o).includes('batman')          ||
      title(o).includes('superman')        ||
      title(o).includes('spider-man')      ||
      title(o).includes('avenger')         ||
      title(o).includes('iron man')        ||
      title(o).includes('thor')            ||
      title(o).includes('captain america') ||
      title(o).includes('black panther')   ||
      title(o).includes('wonder woman')
    ),
  },
  { slug: 'cult-classics', test: o => rating(o) >= 7.5 && votes(o) >= 100000 && year(o) <= 2000 },
  { slug: 'short-films',   test: o => runtime(o) > 0 && runtime(o) < 60 },
  {
    slug: 'based-on-book',
    test: o => {
      const p = plot(o), w = o.Writer?.toLowerCase() ?? ''
      return p.includes('based on the novel')  ||
             p.includes('based on the book')   ||
             p.includes('based on the memoir') ||
             w.includes('novel by')            ||
             w.includes('book by')
    },
  },
  {
    slug: 'true-story',
    test: o => {
      const p = plot(o)
      return p.includes('based on a true story')   ||
             p.includes('based on true events')    ||
             p.includes('based on the true story') ||
             p.includes('inspired by true events') ||
             genre(o).includes('biography')
    },
  },
]

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const sleep    = ms => new Promise(r => setTimeout(r, ms))

const str = v => (v && v !== 'N/A') ? v : null
const int = v => { const n = parseInt(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? null : n }
const flt = v => { const n = parseFloat(v); return isNaN(n) ? null : n }

function parseRuntime(v) {
  const m = String(v ?? '').match(/(\d+)/)
  return m ? parseInt(m[1]) : null
}

function parseRtRating(ratings) {
  const rt = ratings?.find(r => r.Source === 'Rotten Tomatoes')
  return rt ? parseInt(rt.Value) : null
}

async function fetchTraktList(user, slug) {
  const allItems = []
  let page = 1
  while (true) {
    const url = `https://api.trakt.tv/users/${user}/lists/${slug}/items/movies?page=${page}&limit=100`
    const res = await fetch(url, {
      headers: {
        'Content-Type':      'application/json',
        'trakt-api-version': '2',
        'trakt-api-key':     TRAKT_CLIENT_ID,
        'User-Agent':        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    if (!res.ok) throw new Error(`Trakt ${res.status}: ${await res.text()}`)
    const totalPages = parseInt(res.headers.get('x-pagination-page-count') || '1')
    const data = await res.json()
    allItems.push(...data)
    if (page >= totalPages) break
    console.log(`  page ${page + 1}/${totalPages}...`)
    page++
    await sleep(300)
  }
  return allItems
}

// ── Step 1: Fetch all Trakt lists, dedupe by imdb_id ─────
console.log('\n── Fetching Trakt lists ─────────────────────────────')

const seenImdbIds = new Set()
const allItems    = []   // { movie, originSlug }

for (const traktList of TRAKT_LISTS) {
  console.log(`\n→ ${traktList.user}/${traktList.slug}`)
  const items = await fetchTraktList(traktList.user, traktList.slug)
  let added = 0
  for (const item of items) {
    const imdbId = item.movie?.ids?.imdb
    if (!imdbId || seenImdbIds.has(imdbId)) continue
    seenImdbIds.add(imdbId)
    allItems.push({ movie: item.movie, originSlug: traktList.slug })
    added++
  }
  console.log(`  ${items.length} items fetched, ${added} new (${items.length - added} duplicates skipped)`)
}

console.log(`\nTotal unique movies to process: ${allItems.length}\n`)

// ── Step 2: Fetch full OMDB data ──────────────────────────
console.log('── Fetching OMDB data ───────────────────────────────')

const rows  = []
let skipped = 0

for (let i = 0; i < allItems.length; i++) {
  const { movie, originSlug } = allItems[i]
  const imdbId = movie.ids?.imdb

  process.stdout.write(`  [${i + 1}/${allItems.length}] ${movie.title} (${movie.year})... `)

  let o
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}&plot=full`)
    if (!res.ok) { console.log(`HTTP ${res.status}`); skipped++; await sleep(200); continue }
    o = await res.json()
  } catch (e) {
    console.log(`error: ${e.message}`); skipped++; await sleep(200); continue
  }

  if (o.Response === 'False') {
    console.log(`rejected: ${o.Error}`); skipped++; await sleep(200); continue
  }

  const imdbRating = flt(o.imdbRating)
  const poster     = str(o.Poster)

  if (!imdbRating || !poster) {
    console.log(`skipped (imdb=${o.imdbRating} poster=${o.Poster})`); skipped++; await sleep(200); continue
  }

  console.log(`✓  IMDb ${imdbRating}  RT ${parseRtRating(o.Ratings) ?? '—'}%`)

  rows.push({
    omdb: o,
    dbRow: {
      imdb_id:     o.imdbID,
      title:       str(o.Title)   ?? movie.title,
      year:        int(o.Year)    ?? movie.year ?? null,
      genre:       str(o.Genre),
      imdb_rating: imdbRating,
      rt_rating:   parseRtRating(o.Ratings),
      poster_url:  poster,
      plot:        str(o.Plot),
      director:    str(o.Director),
      writer:      str(o.Writer),
      actors:      str(o.Actors),
      awards:      str(o.Awards),
      runtime:     parseRuntime(o.Runtime),
      rated:       str(o.Rated),
      released:    str(o.Released),
      language:    str(o.Language),
      country:     str(o.Country),
      metascore:   int(o.Metascore),
      imdb_votes:  int(o.imdbVotes),
      box_office:  str(o.BoxOffice),
      production:  str(o.Production),
      origin_list: originSlug,
      omdb_raw:    o,
    }
  })

  await sleep(150)
}

console.log(`\nCollected ${rows.length} movies (skipped ${skipped})\n`)
if (rows.length === 0) { console.error('Nothing to insert.'); process.exit(1) }

// ── Step 3: Get all list ids ──────────────────────────────
const { data: listRows, error: listErr } = await supabase
  .from('lists').select('id, slug')

if (listErr) { console.error('Error fetching lists:', listErr.message); process.exit(1) }

const listMap = Object.fromEntries(listRows.map(l => [l.slug, l.id]))
console.log(`Lists in DB: ${Object.keys(listMap).length} found\n`)

// ── Step 4: Upsert movies in batches of 500 ──────────────
console.log('── Upserting movies ─────────────────────────────────')

const BATCH = 500
const idMap = {}

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { data: inserted, error: moviesErr } = await supabase
    .from('movies')
    .upsert(batch.map(r => r.dbRow), { onConflict: 'imdb_id' })
    .select('id, imdb_id')

  if (moviesErr) { console.error('Error inserting movies:', moviesErr.message); process.exit(1) }
  for (const m of inserted) idMap[m.imdb_id] = m.id
  console.log(`  Upserted ${i + batch.length}/${rows.length}`)
}

// ── Step 5: Auto-assign to lists ─────────────────────────
console.log('\n── Assigning to categories ──────────────────────────')

const links  = []
const counts = {}

for (const { omdb, dbRow } of rows) {
  const movieId = idMap[dbRow.imdb_id]
  if (!movieId) continue

  for (const rule of CATEGORY_RULES) {
    if (!listMap[rule.slug]) continue
    if (rule.test(omdb)) {
      links.push({ list_id: listMap[rule.slug], movie_id: movieId })
      counts[rule.slug] = (counts[rule.slug] ?? 0) + 1
    }
  }
}

// Upsert links in batches
for (let i = 0; i < links.length; i += BATCH) {
  const { error: linkErr } = await supabase
    .from('list_movies')
    .upsert(links.slice(i, i + BATCH), { onConflict: 'list_id,movie_id' })
  if (linkErr) { console.error('Error linking movies:', linkErr.message); process.exit(1) }
}

// ── Summary ───────────────────────────────────────────────
console.log('\nDone! Movies per category:')
for (const rule of CATEGORY_RULES) {
  const c = counts[rule.slug] ?? 0
  if (c > 0) console.log(`  ${rule.slug}: ${c}`)
}
console.log(`\n  Total movies: ${rows.length}`)
console.log(`  Total list links: ${links.length}`)
