#!/usr/bin/env tsx
/**
 * Blakadder Device Data Extraction Script
 *
 * This script fetches device definitions from the Blakadder Zigbee repository
 * and saves them to data/sources/blakadder.json for importing into the database.
 *
 * Usage:
 *   pnpm extract:blakadder
 *   OR
 *   tsx scripts/extract-blakadder-devices.ts
 *
 * The script will:
 * 1. Clone the blakadder/zigbee repository temporarily
 * 2. Parse all .md files in the _zigbee directory
 * 3. Extract YAML frontmatter from each file
 * 4. Save to data/sources/blakadder.json
 * 5. Clean up the temporary directory
 */

import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as yaml from 'js-yaml'
import os from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const outputPath = join(projectRoot, 'data/sources/blakadder.json')

// Ensure data/sources directory exists
const sourcesDir = join(projectRoot, 'data/sources')
if (!existsSync(sourcesDir)) {
  mkdirSync(sourcesDir, { recursive: true })
  console.log('📁 Created data/sources directory')
}

console.log('🔍 Blakadder Device Extraction Script')
console.log('========================================\n')

let tmpDir = join(os.tmpdir(), `blakadder-repo-${Date.now()}`)

try {
  // Clone the repository
  console.log(`📂 Cloning blakadder/zigbee repository to ${tmpDir}...`)
  execSync(`git clone --depth 1 https://github.com/blakadder/zigbee.git ${tmpDir}`, {
    stdio: 'inherit',
  })

  const zigbeeDir = join(tmpDir, '_zigbee')
  if (!existsSync(zigbeeDir)) {
    throw new Error(`Could not find _zigbee directory in cloned repo at ${zigbeeDir}`)
  }

  const files = readdirSync(zigbeeDir).filter((f) => f.endsWith('.md'))
  console.log(`\n📖 Found ${files.length} device files`)

  const allDevices: any[] = []
  let processed = 0

  console.log('⚙️  Extracting device data...')

  for (const file of files) {
    try {
      const content = readFileSync(join(zigbeeDir, file), 'utf-8')
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)

      if (frontmatterMatch) {
        const data = yaml.load(frontmatterMatch[1]) as any
        if (data && (data.model || data.title)) {
          // Normalize some fields if necessary
          allDevices.push({
            ...data,
            _source_file: file,
          })
        }
      }

      processed++
      if (processed % 500 === 0) {
        console.log(`   Processed ${processed}/${files.length} files...`)
      }
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${file}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`✓ Extracted data from ${allDevices.length} devices\n`)

  // Add extraction metadata
  const output = {
    metadata: {
      source: 'blakadder-zigbee',
      extractedAt: new Date().toISOString(),
      deviceCount: allDevices.length,
      filesProcessed: processed,
    },
    devices: allDevices,
  }

  // Write to file
  console.log('💾 Writing to data/sources/blakadder.json...')
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')

  const fileSizeMB = (Buffer.byteLength(JSON.stringify(output)) / 1024 / 1024).toFixed(2)
  console.log(`✓ Saved ${allDevices.length} devices (${fileSizeMB} MB)`)
  console.log(`✓ Output: ${outputPath}\n`)

  // Cleanup
  console.log('🧹 Cleaning up temporary repository...')
  rmSync(tmpDir, { recursive: true, force: true })

  console.log('\n✨ Extraction completed successfully!')
  console.log('\nNext steps:')
  console.log(
    '  1. Review the extracted data: cat data/sources/blakadder.json | jq ".devices | length"',
  )
  console.log('  2. Import into database: pnpm cli import blakadder (when implemented)')

  process.exit(0)
} catch (error) {
  console.error('\n❌ Error during extraction:')
  console.error(error)

  // Cleanup on error
  if (existsSync(tmpDir)) {
    console.log('\n🧹 Attempting cleanup of temporary repository...')
    rmSync(tmpDir, { recursive: true, force: true })
  }

  process.exit(1)
}
