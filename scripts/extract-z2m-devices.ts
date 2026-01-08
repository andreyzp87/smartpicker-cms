/**
 * Run this script periodically to update source data:
 * npx tsx scripts/extract-z2m-devices.ts
 *
 * 1. Temporarily installs zigbee-herdsman-converters
 * 2. Extracts device definitions to JSON
 * 3. Saves to data/sources/zigbee2mqtt.json
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

// Install temporarily
execSync('pnpm install zigbee-herdsman-converters --no-save')

// Import and extract
// @ts-ignore
const zhc = await import('zigbee-herdsman-converters')
const devices = zhc.definitions.map((d: any) => ({
  vendor: d.vendor,
  model: d.model,
  description: d.description,
  exposes: d.exposes,
  // ... extract what we need
}))

writeFileSync('data/sources/zigbee2mqtt.json', JSON.stringify(devices, null, 2))
console.log(`Extracted ${devices.length} devices`)

// Cleanup
execSync('pnpm remove zigbee-herdsman-converters')
