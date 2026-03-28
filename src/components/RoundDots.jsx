export default function RoundDots({ total, current }) {
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current
              ? 'w-2 h-2 bg-accent'
              : i === current
                ? 'w-2.5 h-2.5 bg-white'
                : 'w-2 h-2 bg-border'
          }`}
        />
      ))}
    </div>
  )
}
