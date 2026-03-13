import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './routes/index'
import { createContext } from './routes/trpc'
import { logger } from './lib/logger'

const app = new Hono()

// Middleware
app.use('*', honoLogger())

// The Vite dev server runs on a different origin; production admin is same-origin.
if (process.env.NODE_ENV === 'development') {
  app.use(
    '/api/*',
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    }),
  )
}

// tRPC API routes
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  }),
)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve data exports
app.get(
  '/api/exports/*',
  serveStatic({
    root: './data/exports',
    rewriteRequestPath: (path) => path.replace('/api/exports/', '/'),
  }),
)

// Serve static admin UI (production)
app.use(
  '/admin/*',
  serveStatic({
    root: './admin/dist',
    rewriteRequestPath: (path) => path.replace('/admin', ''),
  }),
)
app.get('/admin', serveStatic({ root: './admin/dist', path: '/index.html' }))
// SPA fallback: serve index.html for all non-file admin routes
app.get('/admin/*', serveStatic({ root: './admin/dist', path: '/index.html' }))

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'SmartPicker CMS API',
    version: '0.1.0',
    endpoints: {
      api: '/api/trpc',
      health: '/health',
      admin: '/admin',
      exports: '/api/exports',
    },
  })
})

// Start server
const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`Server listening on http://localhost:${info.port}`)
  logger.info(`Admin UI: http://localhost:${info.port}/admin`)
  logger.info(`API: http://localhost:${info.port}/api/trpc`)
})
