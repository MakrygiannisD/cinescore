export function getOrCreatePlayerId() {
  let id = localStorage.getItem('cinescore_player_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('cinescore_player_id', id)
  }
  return id
}

export function getPlayerName() {
  return localStorage.getItem('cinescore_name') || ''
}

export function savePlayerName(name) {
  localStorage.setItem('cinescore_name', name)
}
