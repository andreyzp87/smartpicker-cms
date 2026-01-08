import { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

const SESSION_COOKIE_NAME = 'sp_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function verifyPassword(password: string): Promise<boolean> {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
  if (!adminPasswordHash) {
    return false
  }
  // Simple comparison for MVP - use bcrypt in production
  return password === adminPasswordHash
}

export function setSessionCookie(c: Context, sessionId: string) {
  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
    sameSite: 'Lax',
  })
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME)
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME)
}
