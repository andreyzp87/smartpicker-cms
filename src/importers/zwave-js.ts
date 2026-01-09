import { readFile } from 'fs/promises'
import { Importer, ImportResult } from './types'

export const zwaveJsImporter: Importer = {
  name: 'zwave-js',

  async fetch(): Promise<ImportResult> {
    const data = await readFile('data/sources/zwave-js.json', 'utf-8')
    const parsed = JSON.parse(data)
    const devices = Array.isArray(parsed) ? parsed : parsed.devices || []

    // Extract metadata if available from the extraction script
    const extractedAt = parsed.metadata?.extractedAt
      ? new Date(parsed.metadata.extractedAt)
      : new Date()

    return {
      source: 'zwave-js',
      devices,
      metadata: {
        fetchedAt: extractedAt,
        count: devices.length,
      },
    }
  },
}
