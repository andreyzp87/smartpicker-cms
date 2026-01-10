import { db } from '../db/client'
import { rawImports } from '../db/schema'
import { ImportResult, RawDevice } from './types'
import { createHash } from 'node:crypto'

export async function storeRawImports(result: ImportResult) {
  const { source, devices } = result
  let count = 0

  for (const device of devices) {
    const sourceId = getSourceId(source, device)

    // Sanitize device data: remove null bytes which PostgreSQL JSONB doesn't support
    const sanitizedDevice = sanitizeNullBytes(device)
    const dataString = JSON.stringify(sanitizedDevice)
    const checksum = createHash('sha256').update(dataString).digest('hex')

    await db
      .insert(rawImports)
      .values({
        source,
        sourceId,
        data: sanitizedDevice,
        checksum,
        importedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [rawImports.source, rawImports.sourceId],
        set: {
          data: sanitizedDevice,
          checksum,
          importedAt: new Date(),
        },
      })

    count++
  }

  return { count }
}

/**
 * Recursively remove null bytes from strings in an object
 * PostgreSQL JSONB doesn't support \u0000 (null bytes) in text
 */
function sanitizeNullBytes(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\u0000/g, '')
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNullBytes)
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeNullBytes(value)
    }
    return sanitized
  }

  return obj
}

function getSourceId(source: string, device: RawDevice): string {
  if (source === 'blakadder') {
    return (device._source_file as string) || `${device.vendor}-${device.model}`
  }
  if (source === 'zigbee2mqtt') {
    return device.model
  }
  if (source === 'zwave-js') {
    // Z-Wave devices use _source_file as unique identifier (e.g., "0x0000/500_series_controller.json")
    return (device._source_file as string) || `${device.manufacturerId}-${device.label}`
  }
  return `${device.vendor}-${device.model}`
}
