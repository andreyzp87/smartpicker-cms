import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'

const connection = { connection: redis }

export const importQueue = new Queue('imports', connection)
export const processQueue = new Queue('processing', connection)
export const exportQueue = new Queue('exports', connection)

export function createWorkers() {
  new Worker(
    'imports',
    async (job) => {
      const { source } = job.data
      logger.info({ source }, 'Starting import')

      // const importer = getImporter(source)
      // const result = await importer.fetch()
      // await storeRawImports(result)

      logger.info({ source }, 'Import complete')
    },
    { ...connection, concurrency: 1 },
  )

  new Worker(
    'processing',
    async (job) => {
      const { importIds } = job.data
      logger.info({ count: importIds.length }, 'Processing imports')

      for (const id of importIds) {
        // await transformImport(id)
        logger.info({ id }, 'Processed import')
      }
    },
    { ...connection, concurrency: 3 },
  )

  new Worker(
    'exports',
    async () => {
      logger.info('Starting export')
      // await generateExports()

      // Optionally trigger frontend rebuild
      if (process.env.CLOUDFLARE_DEPLOY_HOOK) {
        await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, { method: 'POST' })
      }

      logger.info('Export complete')
    },
    { ...connection, concurrency: 1 },
  )
}
