import { Worker } from 'bullmq'
import { redis } from './lib/redis'

console.log('Worker starting...')

const worker = new Worker(
  'main-queue',
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`)
    // Job logic here
  },
  { connection: redis },
)

worker.on('completed', (job) => {
  console.log(`${job.id} has completed!`)
})

worker.on('failed', (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`)
})
