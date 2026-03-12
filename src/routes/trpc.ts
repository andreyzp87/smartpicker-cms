import { TRPCError, initTRPC } from '@trpc/server'
import { Context } from 'hono'
import { clearSessionCookie, getAuthSession, getSessionCookie } from '../lib/auth'
import type { AuthSession, AuthUser } from '../lib/auth'

export interface TRPCContext {
  [key: string]: unknown
  c: Context
  session: AuthSession | null
  user: AuthUser | null
}

// Create context function for tRPC adapter
// @hono/trpc-server passes (opts, c) as two separate arguments
export const createContext = async (_opts: unknown, c: Context): Promise<TRPCContext> => {
  const session = await getAuthSession(c)

  if (!session && getSessionCookie(c)) {
    clearSessionCookie(c)
  }

  return {
    c,
    session,
    user: session?.user ?? null,
  }
}

const t = initTRPC.context<TRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
const requireAuth = middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  })
})

export const protectedProcedure = t.procedure.use(requireAuth)
