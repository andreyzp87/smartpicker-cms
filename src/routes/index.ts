import { router } from './trpc'
import { productsRouter } from './products'
import { manufacturersRouter } from './manufacturers'
import { categoriesRouter } from './categories'
import { hubsRouter } from './hubs'
import { importsRouter } from './imports'
import { compatibilityRouter } from './compatibility'
import { exportsRouter } from './exports'
import { authRouter } from './auth'
import { usersRouter } from './users'

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  products: productsRouter,
  manufacturers: manufacturersRouter,
  categories: categoriesRouter,
  hubs: hubsRouter,
  imports: importsRouter,
  compatibility: compatibilityRouter,
  exports: exportsRouter,
})

export type AppRouter = typeof appRouter
