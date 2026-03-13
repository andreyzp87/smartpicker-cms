import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { sessions, users } from '../db/schema'
import {
  clearSessionCookie,
  createSessionToken,
  loginInputSchema,
  getSessionCookie,
  getSessionExpiry,
  hashSessionToken,
  setSessionCookie,
  verifyPassword,
} from '../lib/auth'
import { publicProcedure, router } from './trpc'

function toSafeUser(user: {
  id: number
  email: string
  name: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return {
      user: ctx.user ? toSafeUser(ctx.user) : null,
    }
  }),

  login: publicProcedure.input(loginInputSchema).mutation(async ({ ctx, input }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    })

    if (!user || !user.isActive) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash)

    if (!isValidPassword) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    }

    const sessionToken = createSessionToken()
    const expiresAt = getSessionExpiry()

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      await tx.insert(sessions).values({
        userId: user.id,
        tokenHash: hashSessionToken(sessionToken),
        expiresAt,
        lastSeenAt: new Date(),
        createdAt: new Date(),
      })
    })

    setSessionCookie(ctx.c, sessionToken)

    return {
      user: toSafeUser({
        ...user,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      }),
    }
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const sessionToken = getSessionCookie(ctx.c)

    if (sessionToken) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(sessionToken)))
    }

    clearSessionCookie(ctx.c)

    return { success: true }
  }),
})
