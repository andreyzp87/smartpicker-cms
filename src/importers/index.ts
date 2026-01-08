import { blakadderImporter } from './blakadder'
import { zigbee2mqttImporter } from './zigbee2mqtt'
import { zwaveJsImporter } from './zwave-js'
import { Importer } from './types'

export const importers: Record<string, Importer> = {
  blakadder: blakadderImporter,
  zigbee2mqtt: zigbee2mqttImporter,
  'zwave-js': zwaveJsImporter,
}

export function getImporter(name: string): Importer {
  const importer = importers[name]
  if (!importer) {
    throw new Error(`Importer not found: ${name}`)
  }
  return importer
}
