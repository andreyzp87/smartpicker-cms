import { readFile } from 'fs/promises'
import { Importer, ImportResult } from './types'

export const zigbee2mqttImporter: Importer = {
  name: 'zigbee2mqtt',

  async fetch(): Promise<ImportResult> {
    // Read from pre-extracted JSON
    const data = await readFile('data/sources/zigbee2mqtt.json', 'utf-8')
    const parsed = JSON.parse(data)
    const devices = Array.isArray(parsed) ? parsed : parsed.devices || []

    return {
      source: 'zigbee2mqtt',
      devices,
      metadata: {
        fetchedAt: new Date(),
        count: devices.length,
      },
    }
  },
}
