import { Command } from 'commander'
import { getImporter } from './importers'
import { storeRawImports } from './importers/service'
import { transformAllUnprocessed, backfillCompatibility, backfillCategories } from './processors'
import { deduplicateProducts, getDuplicateStats } from './deduplication'
import { exportService } from './services/export.service'
import { db } from './db/client'
import { users } from './db/schema'
import {
  authEmailSchema,
  authPasswordSchema,
  authNameSchema,
  formatZodError,
  hashPassword,
} from './lib/auth'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'

const program = new Command()

program.name('smartpicker-cli').description('CLI for SmartPicker CMS').version('0.1.0')

function handleCliValidationError(error: unknown): never {
  if (error instanceof ZodError) {
    console.error(`❌ Invalid input: ${formatZodError(error)}`)
    process.exit(1)
  }

  throw error
}

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
  .command('backfill-categories')
  .description('Backfill categories for existing imported products that are still uncategorized')
  .action(async () => {
    try {
      console.log('🔄 Backfilling categories...')

      const { processed, categorized, skipped } = await backfillCategories()

      console.log(`\n✅ Category backfill complete!`)
      console.log(`   Products processed: ${processed}`)
      console.log(`   Categories assigned: ${categorized}`)
      console.log(`   Skipped: ${skipped}`)

      process.exit(0)
    } catch (error) {
      console.error('❌ Category backfill failed:')
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

program
  .command('users:create')
  .description('Create an admin user for CMS login')
  .requiredOption('--email <email>', 'User email address')
  .requiredOption('--name <name>', 'Display name')
  .requiredOption('--password <password>', 'User password')
  .action(async (options: { email: string; name: string; password: string }) => {
    try {
      const email = authEmailSchema.parse(options.email)
      const name = authNameSchema.parse(options.name)
      const password = authPasswordSchema.parse(options.password)
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      })

      if (existingUser) {
        console.error(`❌ User with email ${email} already exists`)
        process.exit(1)
      }

      const [user] = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash: await hashPassword(password),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
        })

      console.log(`✅ Created admin user`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      process.exit(0)
    } catch (error) {
      let finalError: unknown = error
      try {
        handleCliValidationError(error)
      } catch (unexpectedError) {
        finalError = unexpectedError
      }
      console.error('❌ Failed to create user:')
      console.error(finalError)
      process.exit(1)
    }
  })

program
  .command('users:set-password')
  .description('Set a new password for an existing admin user')
  .requiredOption('--email <email>', 'User email address')
  .requiredOption('--password <password>', 'New password')
  .action(async (options: { email: string; password: string }) => {
    try {
      const email = authEmailSchema.parse(options.email)
      const password = authPasswordSchema.parse(options.password)
      const [user] = await db
        .update(users)
        .set({
          passwordHash: await hashPassword(password),
          updatedAt: new Date(),
        })
        .where(eq(users.email, email))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
        })

      if (!user) {
        console.error(`❌ User with email ${email} not found`)
        process.exit(1)
      }

      console.log(`✅ Updated password for ${user.email}`)
      process.exit(0)
    } catch (error) {
      let finalError: unknown = error
      try {
        handleCliValidationError(error)
      } catch (unexpectedError) {
        finalError = unexpectedError
      }
      console.error('❌ Failed to update password:')
      console.error(finalError)
      process.exit(1)
    }
  })

program
  .command('export')
  .description('Generate JSON exports for public frontend')
  .option(
    '-t, --type <type>',
    'Export type (products, manufacturers, categories, hubs, protocols, all)',
    'all',
  )
  .action(async (options: { type: string }) => {
    try {
      console.log(`📦 Starting export generation (${options.type})...\n`)

      switch (options.type) {
        case 'products': {
          const result = await exportService.generateProductsExport()
          console.log(`✅ Products export complete!`)
          console.log(`   Count: ${result.count}`)
          console.log(`   URL: ${result.url}`)
          break
        }

        case 'manufacturers': {
          const result = await exportService.generateManufacturersExport()
          console.log(`✅ Manufacturers export complete!`)
          console.log(`   Count: ${result.count}`)
          console.log(`   URL: ${result.url}`)
          break
        }

        case 'categories': {
          const result = await exportService.generateCategoriesExport()
          console.log(`✅ Categories export complete!`)
          console.log(`   Count: ${result.count}`)
          console.log(`   URL: ${result.url}`)
          break
        }

        case 'hubs': {
          const result = await exportService.generateHubsExport()
          console.log(`✅ Hubs export complete!`)
          console.log(`   Count: ${result.count}`)
          console.log(`   URL: ${result.url}`)
          break
        }

        case 'protocols': {
          const result = await exportService.generateProtocolsExport()
          console.log(`✅ Protocols export complete!`)
          console.log(`   Count: ${result.count}`)
          console.log(`   URL: ${result.url}`)
          break
        }

        case 'all': {
          const result = await exportService.generateAllExports()
          console.log(`✅ All exports complete!`)
          console.log(`   Products: ${result.products.count}`)
          console.log(`   Manufacturers: ${result.manufacturers.count}`)
          console.log(`   Categories: ${result.categories.count}`)
          console.log(`   Hubs: ${result.hubs.count}`)
          console.log(`   Protocols: ${result.protocols.count}`)
          console.log(`   Site metadata: ${result.site.count}`)
          console.log(`   Sitemap URLs: ${result.sitemap.count}`)
          break
        }

        default:
          console.error(`❌ Unknown export type: ${options.type}`)
          console.error(`   Valid types: products, manufacturers, categories, hubs, protocols, all`)
          process.exit(1)
      }

      process.exit(0)
    } catch (error) {
      console.error('❌ Export failed:')
      console.error(error)
      process.exit(1)
    }
  })

program.parse()
