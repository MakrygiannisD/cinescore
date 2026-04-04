import { useState, useRef, useEffect } from 'react'

export default function ChatPanel({ messages, onSend, displayName }) {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [unread, setUnread]   = useState(0)
  const bottomRef             = useRef(null)
  const prevCount             = useRef(messages.length)

  // Track unread count when panel is closed
  useEffect(() => {
    if (!open && messages.length > prevCount.current) {
      setUnread((u) => u + (messages.length - prevCount.current))
    }
    prevCount.current = messages.length
  }, [messages.length, open])

  // Reset unread + scroll to bottom when opened
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open])

  // Scroll to bottom on new messages while open
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, open])

  function send() {
    const body = input.trim()
    if (!body) return
    onSend(body)
    setInput('')
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function formatTime(iso) {
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-accent
          flex items-center justify-center text-white text-xl
          shadow-accent-float
          hover:brightness-110 transition-all"
      >
        {open ? '×' : '💬'}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold
            w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-72 bg-surface border border-white/[0.07]
          rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden
          animate-scaleIn"
          style={{ height: 340 }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">Chat</span>
            <span className="text-xs text-muted">{messages.length} messages</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-muted text-xs py-4">No messages yet. Say hi!</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-accent/90 truncate max-w-[100px]">
                    {m.display_name}
                  </span>
                  <span className="text-muted flex-shrink-0">{formatTime(m.created_at)}</span>
                </div>
                <p className="text-white/70 leading-snug break-words">{m.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.05] px-3 py-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 200))}
              onKeyDown={onKey}
              placeholder="Message…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs
                text-white placeholder-muted outline-none
                focus:border-accent/40 focus:bg-white/8 transition-colors"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold
                disabled:opacity-30 hover:brightness-110 transition-all"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
