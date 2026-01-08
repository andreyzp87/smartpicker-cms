import { importQueue, exportQueue } from './queues'

export async function setupSchedules() {
  // Daily imports at 3 AM UTC
  await importQueue.upsertJobScheduler(
    'daily-zigbee2mqtt',
    { pattern: '0 3 * * *' },
    { name: 'import', data: { source: 'zigbee2mqtt' } },
  )

  await importQueue.upsertJobScheduler(
    'daily-blakadder',
    { pattern: '30 3 * * *' },
    { name: 'import', data: { source: 'blakadder' } },
  )

  await importQueue.upsertJobScheduler(
    'daily-zwave-js',
    { pattern: '0 4 * * *' },
    { name: 'import', data: { source: 'zwave-js' } },
  )

  // Daily export at 5 AM UTC
  await exportQueue.upsertJobScheduler(
    'daily-export',
    { pattern: '0 5 * * *' },
    { name: 'export', data: {} },
  )
}
