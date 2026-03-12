import { initTRPC } from '@trpc/server'
import { Context } from 'hono'

export interface TRPCContext {
  [key: string]: unknown
  c: Context
}

// Create context function for tRPC adapter
// @hono/trpc-server passes (opts, c) as two separate arguments
export const createContext = (_opts: unknown, c: Context): TRPCContext => {
  return { c }
}

const t = initTRPC.context<TRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
