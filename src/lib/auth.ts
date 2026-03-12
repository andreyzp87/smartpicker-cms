import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { sessions, users } from '../db/schema'

const scrypt = promisify(nodeScrypt)

export const SESSION_COOKIE_NAME = 'sp_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const PASSWORD_HASH_PREFIX = 'scrypt'
const PASSWORD_SALT_BYTES = 16
const PASSWORD_KEY_LENGTH = 64
const SESSION_TOKEN_BYTES = 32

export interface AuthUser {
  id: number
  email: string
  name: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthSession {
  id: number
  userId: number
  expiresAt: Date
  lastSeenAt: Date
  createdAt: Date
  user: AuthUser
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const authEmailSchema = z.email().transform(normalizeEmail)

export const authNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(255, 'Name must be at most 255 characters')

export const authPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

export const loginInputSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
})

export const userCreateInputSchema = z.object({
  email: authEmailSchema,
  name: authNameSchema,
  password: authPasswordSchema,
})

export const userUpdateInputSchema = z.object({
  email: authEmailSchema,
  name: authNameSchema,
  isActive: z.boolean(),
})

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(', ')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex')
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer

  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [prefix, salt, hash] = passwordHash.split(':')

  if (!prefix || !salt || !hash || prefix !== PASSWORD_HASH_PREFIX) {
    return false
  }

  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer
  const storedHash = Buffer.from(hash, 'hex')

  if (storedHash.length !== derivedKey.length) {
    return false
  }

  return timingSafeEqual(storedHash, derivedKey)
}

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_MAX_AGE * 1000)
}

export function setSessionCookie(c: Context, sessionToken: string) {
  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
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
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
  })
}

export async function getAuthSession(c: Context): Promise<AuthSession | null> {
  const sessionToken = getSessionCookie(c)

  if (!sessionToken) {
    return null
  }

  const [session] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      createdAt: sessions.createdAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(sessionToken)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!session || !session.user.isActive) {
    return null
  }

  return session
}
