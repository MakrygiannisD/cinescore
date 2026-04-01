export default function RoundDots({ total, current }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-400 ${
            i < current
              ? 'w-2 h-2 bg-accent shadow-[0_0_6px_rgba(99,102,241,0.6)]'
              : i === current
                ? 'w-2.5 h-2.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)] animate-pulse'
                : 'w-2 h-2 bg-border'
          }`}
        />
      ))}
    </div>
  )
}
