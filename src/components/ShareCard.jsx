import { useRef, useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { gradeColor, getGrade } from '../lib/scoring'

/* ── accuracy block color ────────────────────────────────── */
function blockColor(score) {
  if (score >= 85) return '#4ade80' // green
  if (score >= 55) return '#facc15' // yellow
  if (score >= 25) return '#fb923c' // orange
  return '#f87171'                  // red
}

function blockEmoji(score) {
  if (score >= 85) return '🟩'
  if (score >= 55) return '🟨'
  if (score >= 25) return '🟧'
  return '🟥'
}

/* ── date string ─────────────────────────────────────────── */
function fmtDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ═══════════════════════════════════════════════════════════
   ShareCard — works for daily + multiplayer
   ═══════════════════════════════════════════════════════════ */
export default function ShareCard({
  total,
  maxScore = 500,
  roundScores,        // array of per-round totals, e.g. [92, 85, 62, 96, 85]
  mode = 'daily',     // 'daily' | 'multiplayer'
  rank = null,        // multiplayer rank (1-based)
  playerCount = null, // multiplayer player count
  mvpBadges = [],     // [{ icon, label }]
  listName = null,
  posterUrl = null,   // best-round movie poster for background
}) {
  const cardRef   = useRef(null)
  const [busy, setBusy]       = useState(false)
  const [copied, setCopied]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const color       = gradeColor(total, maxScore)
  const { label }   = getGrade(total, maxScore)

  /* ── generate image ────────────────────────────────────── */
  const capture = useCallback(async () => {
    if (!cardRef.current) return null
    return toPng(cardRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#09090e',
    })
  }, [])

  /* ── share (native or download) ────────────────────────── */
  const handleShare = useCallback(async () => {
    setBusy(true)
    try {
      const dataUrl = await capture()
      if (!dataUrl) return

      // convert to blob
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'cinescore-result.png', { type: 'image/png' })

      // text version for clipboard / share body
      const blocks = roundScores.map(s => blockEmoji(s)).join('')
      const textLines = [
        `🎬 CineScore ${mode === 'daily' ? 'Daily' : 'Multiplayer'}`,
        `${blocks}  ${total}/${maxScore}`,
        `${label}`,
        ...(rank ? [`🏆 #${rank} of ${playerCount}`] : []),
        ...(mvpBadges.length ? [mvpBadges.map(b => `${b.icon} ${b.label}`).join(' ')] : []),
        '',
        'https://cinescore.gr',
      ]
      const shareText = textLines.join('\n')

      // try native share with image
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText })
      } else if (navigator.share) {
        await navigator.share({ text: shareText })
      } else {
        // fallback: copy text to clipboard
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Share failed:', err)
    } finally {
      setBusy(false)
    }
  }, [capture, total, maxScore, roundScores, mode, rank, playerCount, mvpBadges, label])

  /* ── save image ────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    setBusy(true)
    try {
      const dataUrl = await capture()
      if (!dataUrl) return
      const link = document.createElement('a')
      link.download = `cinescore-${mode}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setBusy(false)
    }
  }, [capture, mode])

  /* ── rank label ────────────────────────────────────────── */
  const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`
  const rankIcon  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅'

  return (
    <div className="flex flex-col gap-3 animate-fadeUp" style={{ animationDelay: '0.2s' }}>

      {/* ── THE CARD (captured as image) ─────────────────── */}
      <div
        ref={cardRef}
        style={{
          background: '#09090e',
          borderRadius: 20,
          padding: 0,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* poster background */}
        {posterUrl && (
          <img
            src={posterUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 20%',
              filter: 'blur(2px) saturate(0.6) brightness(0.35)',
            }}
          />
        )}

        {/* dark overlay on poster */}
        <div style={{
          position: 'absolute', inset: 0,
          background: posterUrl
            ? 'linear-gradient(180deg, rgba(9,9,14,0.55) 0%, rgba(9,9,14,0.85) 50%, rgba(9,9,14,0.97) 100%)'
            : 'linear-gradient(170deg, #0f0f1a 0%, #09090e 40%, #0a0a14 100%)',
        }} />

        {/* content wrapper (above poster) */}
        <div style={{ position: 'relative', padding: '32px 28px 24px' }}>

        {/* top glow */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: `linear-gradient(to right, transparent, ${color}40, transparent)`,
        }} />

        {/* corner accent */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 120, height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
        }} />

        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: '#6366f1', textTransform: 'uppercase' }}>
            CineScore
          </div>
          <div style={{ fontSize: 11, color: '#6464a0', marginTop: 2, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {mode === 'daily' ? 'Daily Quiz' : 'Multiplayer'}{listName ? ` • ${listName}` : ''}
          </div>
        </div>

        {/* multiplayer rank */}
        {mode === 'multiplayer' && rank && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>{rankIcon}</span>
            <div style={{
              fontSize: 20, fontWeight: 900, color: '#f0f0f5', marginTop: 4,
              textShadow: `0 0 20px ${color}60`,
            }}>
              {rankLabel} Place
            </div>
            <div style={{ fontSize: 11, color: '#6464a0', marginTop: 2 }}>
              out of {playerCount} player{playerCount !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* score circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            border: `5px solid ${color}`,
            boxShadow: `0 0 40px ${color}25, 0 0 80px ${color}10, inset 0 0 30px ${color}08`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: 11, color: '#6464a080', marginTop: 2 }}>/ {maxScore}</span>
          </div>
        </div>

        {/* grade */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color }}>{label}</div>
        </div>

        {/* accuracy blocks */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          {roundScores.map((s, i) => (
            <div key={i} style={{
              width: 44, height: 44, borderRadius: 10,
              background: `${blockColor(s)}18`,
              border: `1.5px solid ${blockColor(s)}40`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: blockColor(s), lineHeight: 1 }}>{s}</span>
              <span style={{ fontSize: 8, color: '#6464a080', marginTop: 1 }}>R{i + 1}</span>
            </div>
          ))}
        </div>

        {/* MVP badges for multiplayer */}
        {mvpBadges.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
            {mvpBadges.map((b) => (
              <span key={b.label} style={{
                fontSize: 10, fontWeight: 700, color: '#ffffffaa',
                background: '#ffffff08', border: '1px solid #ffffff15',
                padding: '3px 10px', borderRadius: 99,
              }}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}

        {/* footer */}
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: '1px solid #ffffff08',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 0.5 }}>
            cinescore.gr
          </span>
          <span style={{ fontSize: 10, color: '#6464a060' }}>
            {fmtDate()}
          </span>
        </div>

        </div>{/* end content wrapper */}
      </div>

      {/* ── ACTION BUTTONS ───────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          disabled={busy}
          className="flex-1 py-3.5 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95
            transition-all shadow-[0_4px_24px_rgba(99,102,241,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {copied ? (
            <><CheckIcon /> Copied!</>
          ) : (
            <><ShareIcon /> Share Result</>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={busy}
          className="px-4 py-3.5 bg-surface border border-white/[0.08] text-white/70 font-semibold rounded-xl
            hover:bg-surface2 hover:text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          title="Save image"
        >
          {saved ? <CheckIcon /> : <DownloadIcon />}
        </button>
      </div>
    </div>
  )
}

/* ── tiny inline SVG icons ───────────────────────────────── */
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
