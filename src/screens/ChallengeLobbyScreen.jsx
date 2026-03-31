import { useState } from 'react'

export default function ChallengeLobbyScreen({ challengeId, isChallenger, onStart, onHome }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${window.location.origin}?challenge=${challengeId}`

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeUp">

      <div className="text-center pt-2">
        <div className="text-3xl mb-3">⚔️</div>
        <h2 className="text-2xl font-black">
          {isChallenger ? 'Challenge Created!' : "You've Been Challenged!"}
        </h2>
        <p className="text-muted text-sm mt-2 leading-relaxed">
          {isChallenger
            ? 'Share the link below with your opponent. You can both play at the same time!'
            : 'Play the same 5 movies and see who scores higher.'}
        </p>
      </div>

      {/* Share link */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-xs text-muted font-semibold uppercase tracking-widest text-center">
          {isChallenger ? 'Your challenge link' : 'Challenge ID'}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-surface2 rounded-xl px-3 py-2.5 text-xs text-muted font-mono truncate select-all">
            {shareUrl}
          </div>
          <button
            onClick={copyLink}
            className={`px-4 py-2 text-sm font-bold rounded-xl shrink-0 transition-all active:scale-95 ${
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2">
        <div className="text-xs text-muted font-semibold uppercase tracking-widest mb-1">How it works</div>
        {[
          isChallenger ? 'Share the link with your opponent' : 'You received this challenge',
          'Both players guess the same 5 movies',
          'Compare scores when both are done',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-muted">{step}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 bg-accent text-white font-black text-lg rounded-2xl hover:opacity-90 active:scale-95 transition-all"
      >
        {isChallenger ? "I'm Ready — Start!" : 'Accept Challenge →'}
      </button>

      <button
        onClick={onHome}
        className="w-full py-3 bg-transparent border border-border text-muted font-semibold rounded-xl hover:bg-surface2 hover:text-white transition-all active:scale-95"
      >
        Back to Home
      </button>

    </div>
  )
}
