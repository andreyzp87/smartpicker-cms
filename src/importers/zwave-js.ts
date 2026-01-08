import { readFile } from 'fs/promises'
import { Importer, ImportResult } from './types'

export const zwaveJsImporter: Importer = {
  name: 'zwave-js',

  async fetch(): Promise<ImportResult> {
    const data = await readFile('data/sources/zwave-js.json', 'utf-8')
    const devices = JSON.parse(data)

    return {
      source: 'zwave-js',
      devices,
      metadata: {
        fetchedAt: new Date(),
        count: devices.length,
      },
    }
  },
}
