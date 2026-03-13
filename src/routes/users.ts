import { TRPCError } from '@trpc/server'
import { and, asc, count, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { sessions, users } from '../db/schema'
import {
  authPasswordSchema,
  hashPassword,
  userCreateInputSchema,
  userUpdateInputSchema,
} from '../lib/auth'
import { protectedProcedure, router } from './trpc'

const safeUserSelect = {
  id: users.id,
  email: users.email,
  name: users.name,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
}

async function ensureEmailAvailable(email: string, userId?: number) {
  const existingUser = await db.query.users.findFirst({
    where:
      userId === undefined
        ? eq(users.email, email)
        : and(eq(users.email, email), ne(users.id, userId)),
  })

  if (existingUser) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A user with that email already exists',
    })
  }
}

export const usersRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select(safeUserSelect).from(users).orderBy(asc(users.email))
  }),

  create: protectedProcedure.input(userCreateInputSchema).mutation(async ({ input }) => {
    await ensureEmailAvailable(input.email)

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning(safeUserSelect)

    return user
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: userUpdateInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      })

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      await ensureEmailAvailable(input.data.email, input.id)

      if (!input.data.isActive && ctx.user.id === input.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot deactivate your own account',
        })
      }

      if (!input.data.isActive && targetUser.isActive) {
        const [activeUsersResult] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.isActive, true))

        if (Number(activeUsersResult?.count ?? 0) <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'At least one active user is required',
          })
        }
      }

      const [user] = await db
        .update(users)
        .set({
          email: input.data.email,
          name: input.data.name.trim(),
          isActive: input.data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning(safeUserSelect)

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      if (!user.isActive) {
        await db.delete(sessions).where(eq(sessions.userId, user.id))
      }

      return user
    }),

  setPassword: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        password: authPasswordSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [user] = await db
        .update(users)
        .set({
          passwordHash: await hashPassword(input.password),
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning(safeUserSelect)

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      await db.delete(sessions).where(eq(sessions.userId, user.id))

      return user
    }),
})
