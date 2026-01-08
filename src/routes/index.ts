import { router } from './trpc'
import { productsRouter } from './products'
import { manufacturersRouter } from './manufacturers'
import { categoriesRouter } from './categories'
import { hubsRouter } from './hubs'
import { importsRouter } from './imports'
import { compatibilityRouter } from './compatibility'

export const appRouter = router({
  products: productsRouter,
  manufacturers: manufacturersRouter,
  categories: categoriesRouter,
  hubs: hubsRouter,
  imports: importsRouter,
  compatibility: compatibilityRouter,
})

export type AppRouter = typeof appRouter
