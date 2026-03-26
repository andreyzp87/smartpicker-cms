import type { Context } from 'hono'
import type { AuthSession, AuthUser } from '../../../src/lib/auth'

export function createAuthUser(partial: Partial<AuthUser> = {}): AuthUser {
  const now = new Date('2026-01-01T00:00:00.000Z')

  return {
    id: 1,
    email: 'admin@example.com',
    name: 'Admin',
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function createAuthSession(partial: Partial<AuthSession> = {}): AuthSession {
  const now = new Date('2026-01-01T00:00:00.000Z')

  return {
    id: 1,
    userId: 1,
    expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    lastSeenAt: now,
    createdAt: now,
    user: createAuthUser(),
    ...partial,
  }
}

export function createTrpcContext() {
  const session = createAuthSession()

  return {
    c: {} as Context,
    session,
    user: session.user,
  }
}
