const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : 'https://timetable-be.onrender.com').replace(/\/$/, '')

const TOKEN_KEY = 'timetable-access-token'

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export function saveAuthToken(token, remember = false) {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = new Headers()
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL}/api${path.startsWith('/') ? '' : '/'}${path}`

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.message || result.error || 'The request could not be completed.')
    if (result.conflict) {
      error.conflict = result
      error.type = result.type
    }
    if (Array.isArray(result.conflicts)) error.conflicts = result.conflicts
    if (typeof result.valid === 'boolean') error.validation = result
    throw error
  }
  return result
}