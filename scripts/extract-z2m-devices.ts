#!/usr/bin/env tsx
/**
 * Zigbee2MQTT Device Data Extraction Script
 *
 * This script extracts device definitions from the zigbee-herdsman-converters package
 * and saves them to data/sources/zigbee2mqtt.json for importing into the database.
 *
 * Usage:
 *   pnpm extract:z2m
 *   OR
 *   tsx scripts/extract-z2m-devices.ts
 *
 * The script will:
 * 1. Temporarily install zigbee-herdsman-converters (if not present)
 * 2. Extract all device definitions with relevant metadata
 * 3. Save to data/sources/zigbee2mqtt.json
 * 4. Clean up the temporary installation
 */

import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const outputPath = join(projectRoot, 'data/sources/zigbee2mqtt.json')

// Ensure data/sources directory exists
const sourcesDir = join(projectRoot, 'data/sources')
if (!existsSync(sourcesDir)) {
  mkdirSync(sourcesDir, { recursive: true })
  console.log('📁 Created data/sources directory')
}

console.log('🔍 Zigbee2MQTT Device Extraction Script')
console.log('========================================\n')

let shouldCleanup = false

try {
  // Check if zigbee-herdsman-converters is already installed
  let zhcInstalled = false

  try {
    await import('zigbee-herdsman-converters')
    zhcInstalled = true
    console.log('✓ zigbee-herdsman-converters already installed')
  } catch (error) {
    console.log('📦 Installing zigbee-herdsman-converters temporarily...')
    execSync('pnpm add zigbee-herdsman-converters --ignore-workspace', {
      cwd: projectRoot,
      stdio: 'inherit',
    })
    shouldCleanup = true
    console.log('✓ Installation complete\n')
  }

  // Import the package
  console.log('📖 Loading zigbee-herdsman-converters...')
  const zhc = await import('zigbee-herdsman-converters')

  // Load all definitions directly from the package
  console.log('📖 Loading all device definitions...')
  // @ts-ignore
  const devicesModule = await import('zigbee-herdsman-converters/devices/index')
  // Handle CJS/ESM interop and different package versions
  const allDefinitions =
    devicesModule.default?.default || devicesModule.default || devicesModule.definitions || []

  if (!Array.isArray(allDefinitions) || allDefinitions.length === 0) {
    throw new Error('Failed to load device definitions from zigbee-herdsman-converters')
  }

  console.log(`✓ Loaded ${allDefinitions.length} device definitions\n`)

  // Extract device data
  console.log('⚙️  Extracting device data...')
  const allDevices: any[] = []
  let processed = 0

  for (const device of allDefinitions) {
    try {
      // prepareDevice looses many usefull info in modern "exposes" section, so we store raw data in resulting jsoin
      // const device = zhc.prepareDefinition(definition)

      if (device?.model) {
        allDevices.push(device)
      }

      processed++
      if (processed % 500 === 0) {
        console.log(
          `   Processed ${processed}/${allDefinitions.length} definitions... (${allDevices.length} unique devices)`,
        )
      }
    } catch (error) {
      // Silently skip models that can't be resolved
    }
  }

  console.log(`✓ Extracted data from ${allDevices.length} unique devices\n`)

  // Add extraction metadata
  const output = {
    metadata: {
      source: 'zigbee-herdsman-converters',
      extractedAt: new Date().toISOString(),
      deviceCount: allDevices.length,
      modelIDsProcessed: processed,
    },
    devices: allDevices,
  }

  // Write to file
  console.log('💾 Writing to data/sources/zigbee2mqtt.json...')
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')

  const fileSizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(2)
  console.log(`✓ Saved ${allDevices.length} devices (${fileSizeMB} MB)`)
  console.log(`✓ Output: ${outputPath}\n`)

  // Cleanup if we installed temporarily
  if (shouldCleanup && !zhcInstalled) {
    console.log('🧹 Removing temporary installation...')
    execSync('pnpm remove zigbee-herdsman-converters', {
      cwd: projectRoot,
      stdio: 'inherit',
    })
    console.log('✓ Cleanup complete\n')
  }

  console.log('✨ Extraction completed successfully!')
  console.log('\nNext steps:')
  console.log(
    '  1. Review the extracted data: cat data/sources/zigbee2mqtt.json | jq ".devices | length"',
  )
  console.log('  2. Import into database: pnpm cli import zigbee2mqtt (when implemented)')

  process.exit(0)
} catch (error) {
  console.error('\n❌ Error during extraction:')
  console.error(error)

  // Cleanup on error if we installed temporarily
  if (shouldCleanup) {
    try {
      console.log('\n🧹 Attempting cleanup...')
      execSync('pnpm remove zigbee-herdsman-converters', {
        cwd: projectRoot,
        stdio: 'inherit',
      })
      console.log('✓ Cleanup complete')
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError)
    }
  }

  process.exit(1)
}
