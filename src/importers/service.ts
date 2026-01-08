import { db } from '../db/client'
import { rawImports } from '../db/schema'
import { ImportResult, RawDevice } from './types'
import { createHash } from 'node:crypto'

export async function storeRawImports(result: ImportResult) {
  const { source, devices } = result
  let count = 0

  for (const device of devices) {
    const sourceId = getSourceId(source, device)
    const dataString = JSON.stringify(device)
    const checksum = createHash('sha256').update(dataString).digest('hex')

    await db
      .insert(rawImports)
      .values({
        source,
        sourceId,
        data: device,
        checksum,
        importedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [rawImports.source, rawImports.sourceId],
        set: {
          data: device,
          checksum,
          importedAt: new Date(),
        },
      })

    count++
  }

  return { count }
}

function getSourceId(source: string, device: RawDevice): string {
  if (source === 'blakadder') {
    return (device._source_file as string) || `${device.vendor}-${device.model}`
  }
  if (source === 'zigbee2mqtt') {
    return device.model
  }
  if (source === 'zwave-js') {
    return (
      (device.id as string) || (device.productId as string) || `${device.vendor}-${device.model}`
    )
  }
  return `${device.vendor}-${device.model}`
}
