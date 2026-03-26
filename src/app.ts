import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './routes/index'
import { createContext } from './routes/trpc'

export function createApp() {
  const app = new Hono()

  app.use('*', honoLogger())

  if (process.env.NODE_ENV === 'development') {
    app.use(
      '/api/*',
      cors({
        origin: 'http://localhost:5173',
        credentials: true,
      }),
    )
  }

  app.use(
    '/api/trpc/*',
    trpcServer({
      router: appRouter,
      createContext,
    }),
  )

  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.get(
    '/api/exports/*',
    serveStatic({
      root: './data/exports',
      rewriteRequestPath: (path) => path.replace('/api/exports/', '/'),
    }),
  )

  app.use(
    '/admin/*',
    serveStatic({
      root: './admin/dist',
      rewriteRequestPath: (path) => path.replace('/admin', ''),
    }),
  )
  app.get('/admin', serveStatic({ root: './admin/dist', path: '/index.html' }))
  app.get('/admin/*', serveStatic({ root: './admin/dist', path: '/index.html' }))

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

  return app
}

export const app = createApp()
