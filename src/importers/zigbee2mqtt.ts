import { readFile } from 'fs/promises'
import { Importer, ImportResult } from './types'

export const zigbee2mqttImporter: Importer = {
  name: 'zigbee2mqtt',

  async fetch(): Promise<ImportResult> {
    // Read from pre-extracted JSON
    const data = await readFile('data/sources/zigbee2mqtt.json', 'utf-8')
    const devices = JSON.parse(data)

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
