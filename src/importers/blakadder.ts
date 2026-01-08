import { readFile } from 'fs/promises'
import { Importer, ImportResult } from './types'

export const blakadderImporter: Importer = {
  name: 'blakadder',

  async fetch(): Promise<ImportResult> {
    const data = await readFile('data/sources/blakadder.json', 'utf-8')
    const devices = JSON.parse(data)

    return {
      source: 'blakadder',
      devices,
      metadata: {
        fetchedAt: new Date(),
        count: devices.length,
      },
    }
  },
}
