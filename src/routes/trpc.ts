import { initTRPC } from '@trpc/server'
import { Context } from 'hono'

export interface TRPCContext {
  c: Context
}

const t = initTRPC.context<TRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
