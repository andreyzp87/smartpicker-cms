import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../../src/routes'

export const trpc = createTRPCReact<AppRouter>()
