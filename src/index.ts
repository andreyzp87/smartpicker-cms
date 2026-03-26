import { serve } from '@hono/node-server'
import { logger } from './lib/logger'
import { app } from './app'

// Start server
const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`Server listening on http://localhost:${info.port}`)
  logger.info(`Admin UI: http://localhost:${info.port}/admin`)
  logger.info(`API: http://localhost:${info.port}/api/trpc`)
})
