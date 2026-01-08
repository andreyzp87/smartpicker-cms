import { Command } from 'commander'
import { db } from './db/client'
import { getImporter } from './importers'
import { storeRawImports } from './importers/service'

const program = new Command()

program.name('smartpicker-cli').description('CLI for SmartPicker CMS').version('0.1.0')

program
  .command('import')
  .description('Import data from sources')
  .argument('<source>', 'Source to import from (blakadder, zigbee2mqtt, zwave-js)')
  .action(async (source: string) => {
    try {
      console.log(`🔍 Starting import from ${source}...`)
      const importer = getImporter(source)
      const result = await importer.fetch()
      console.log(`📦 Fetched ${result.metadata.count} devices from ${source}`)

      console.log('💾 Storing raw imports in database...')
      const { count } = await storeRawImports(result)
      console.log(`✅ Successfully imported ${count} devices from ${source}`)

      process.exit(0)
    } catch (error) {
      console.error('❌ Import failed:')
      console.error(error)
      process.exit(1)
    }
  })

program.parse()
