import { useState, useEffect, useRef } from 'react'

/**
 * Countdown timer based on an absolute deadline from the DB.
 * @param {string|null} roundDeadline - ISO timestamp string
 * @param {function}    onExpire      - called once when timer reaches 0
 */
export function useSessionTimer(roundDeadline, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const expiredRef   = useRef(false)
  const onExpireRef  = useRef(onExpire)

  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  useEffect(() => {
    if (!roundDeadline) {
      setSecondsLeft(null)
      expiredRef.current = false
      return
    }

    expiredRef.current = false

    function tick() {
      const remaining = Math.max(0, new Date(roundDeadline).getTime() - Date.now())
      const secs = Math.ceil(remaining / 1000)
      setSecondsLeft(secs)

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current?.()
      }
    }

    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [roundDeadline])

  return secondsLeft
}
