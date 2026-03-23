import { router } from './trpc'
import { productsRouter } from './products'
import { manufacturersRouter } from './manufacturers'
import { categoriesRouter } from './categories'
import { platformsRouter } from './platforms'
import { integrationsRouter } from './integrations'
import { commercialHubsRouter } from './commercialHubs'
import { importsRouter } from './imports'
import { compatibilityRouter } from './compatibility'
import { exportsRouter } from './exports'
import { authRouter } from './auth'
import { usersRouter } from './users'
import { dashboardRouter } from './dashboard'

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  dashboard: dashboardRouter,
  products: productsRouter,
  manufacturers: manufacturersRouter,
  categories: categoriesRouter,
  platforms: platformsRouter,
  integrations: integrationsRouter,
  commercialHubs: commercialHubsRouter,
  imports: importsRouter,
  compatibility: compatibilityRouter,
  exports: exportsRouter,
})

export type AppRouter = typeof appRouter
