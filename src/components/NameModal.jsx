import { useState } from 'react'

export default function NameModal({ title, placeholder, onConfirm }) {
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 z-20 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-white/[0.07] rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-scaleIn shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="text-center">
          <div className="text-xl font-black mb-1">{title}</div>
          <div className="text-muted text-sm">So your opponent knows who beat them.</div>
        </div>
        <input
          autoFocus
          type="text"
          maxLength={20}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
          placeholder={placeholder ?? 'Your name'}
          className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-white placeholder-muted outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
        />
        <button
          onClick={() => name.trim() && onConfirm(name.trim())}
          disabled={!name.trim()}
          className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
        >
          Let's go →
        </button>
      </div>
    </div>
  )
}
