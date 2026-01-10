import { Command } from 'commander'
import { db } from './db/client'
import { getImporter } from './importers'
import { storeRawImports } from './importers/service'
import { transformAllUnprocessed, backfillCompatibility } from './processors'
import { deduplicateProducts, getDuplicateStats } from './deduplication'

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

program
  .command('process')
  .description('Transform raw imports into products')
  .option('-l, --limit <number>', 'Limit number of imports to process', parseInt)
  .option('-s, --source <source>', 'Process only imports from specific source')
  .action(async (options: { limit?: number; source?: string }) => {
    try {
      console.log('🔄 Starting transformation...')

      if (options.source) {
        console.log(`   Filtering by source: ${options.source}`)
      }

      if (options.limit) {
        console.log(`   Processing up to ${options.limit} imports`)
      }

      const results = await transformAllUnprocessed(options.limit)

      const created = results.filter((r) => r.created).length
      const updated = results.filter((r) => !r.created).length
      const totalCompatibility = results.reduce((sum, r) => sum + r.compatibilityRecordsCreated, 0)

      console.log(`\n✅ Transformation complete!`)
      console.log(`   Products created: ${created}`)
      console.log(`   Products updated: ${updated}`)
      console.log(`   Compatibility records created: ${totalCompatibility}`)
      console.log(`   Total processed: ${results.length}`)

      process.exit(0)
    } catch (error) {
      console.error('❌ Transformation failed:')
      console.error(error)
      process.exit(1)
    }
  })

program
  .command('backfill-compatibility')
  .description('Backfill compatibility records for existing products')
  .action(async () => {
    try {
      console.log('🔄 Backfilling compatibility records...')

      const { processed, created } = await backfillCompatibility()

      console.log(`\n✅ Backfill complete!`)
      console.log(`   Products processed: ${processed}`)
      console.log(`   Compatibility records created: ${created}`)

      process.exit(0)
    } catch (error) {
      console.error('❌ Backfill failed:')
      console.error(error)
      process.exit(1)
    }
  })

program
  .command('deduplicate')
  .description('Merge duplicate products based on manufacturer + model matching')
  .option('-d, --dry-run', 'Show what would be done without making changes')
  .option('-v, --verbose', 'Show detailed information about each merge')
  .action(async (options: { dryRun?: boolean; verbose?: boolean }) => {
    try {
      console.log('🔍 Analyzing products for duplicates...\n')

      // First, show stats
      const stats = await getDuplicateStats()

      console.log('📊 Duplicate Statistics:')
      console.log(`   Total products: ${stats.totalProducts}`)
      console.log(`   Products with model: ${stats.productsWithModel}`)
      console.log(`   Duplicate groups found: ${stats.duplicateGroups}`)
      console.log(`   Total products in duplicate groups: ${stats.totalDuplicates}`)
      console.log(`   Products that will be merged: ${stats.potentialMerges}`)

      if (stats.duplicateGroups === 0) {
        console.log(`\n✨ No duplicates found!`)
        process.exit(0)
      }

      console.log(`\n🔄 ${options.dryRun ? 'DRY RUN - ' : ''}Starting deduplication...`)

      const result = await deduplicateProducts({
        dryRun: options.dryRun,
        verbose: options.verbose,
      })

      console.log(`\n✅ Deduplication ${options.dryRun ? '(DRY RUN) ' : ''}complete!`)
      console.log(`   Duplicate groups processed: ${result.duplicateGroups}`)
      console.log(`   Products kept: ${result.productsKept}`)
      console.log(`   Products deleted: ${result.productsDeleted}`)
      console.log(`   Product sources created: ${result.productSourcesCreated}`)

      if (options.dryRun) {
        console.log(`\n💡 Run without --dry-run to apply changes`)
      }

      process.exit(0)
    } catch (error) {
      console.error('❌ Deduplication failed:')
      console.error(error)
      process.exit(1)
    }
  })

program.parse()
