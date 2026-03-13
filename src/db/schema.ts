import {
  type AnyPgColumn,
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  decimal,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const protocolEnum = pgEnum('protocol', [
  'zigbee',
  'zwave',
  'matter',
  'wifi',
  'thread',
  'bluetooth',
])

export const productStatusEnum = pgEnum('product_status', ['draft', 'published', 'archived'])

export const compatibilityStatusEnum = pgEnum('compatibility_status', [
  'verified',
  'reported',
  'untested',
  'incompatible',
])

export const zwaveFrequencyEnum = pgEnum('zwave_frequency', ['us', 'eu', 'au', 'jp'])

export const mergeConfidenceEnum = pgEnum('merge_confidence', ['exact', 'high', 'medium', 'low'])

// Tables
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: unique('users_email_unique').on(table.email),
  }),
)

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUnique: unique('sessions_token_hash_unique').on(table.tokenHash),
    userIdx: index('sessions_user_idx').on(table.userId),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
)

export const manufacturers = pgTable('manufacturers', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  website: text('website'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id),
  sortOrder: integer('sort_order').default(0).notNull(),
})

export const hubs = pgTable('hubs', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  manufacturerId: integer('manufacturer_id').references(() => manufacturers.id),
  protocolsSupported: jsonb('protocols_supported').$type<string[]>().default([]),
  description: text('description'),
})

export const rawImports = pgTable(
  'raw_imports',
  {
    id: serial('id').primaryKey(),
    source: varchar('source', { length: 50 }).notNull(),
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    data: jsonb('data').notNull(),
    checksum: varchar('checksum', { length: 64 }),
    productId: integer('product_id').references((): AnyPgColumn => products.id),
    importedAt: timestamp('imported_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    sourceIdx: index('raw_imports_source_idx').on(table.source),
    productIdx: index('raw_imports_product_idx').on(table.productId),
    sourceUnique: unique('raw_imports_source_unique').on(table.source, table.sourceId),
  }),
)

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    manufacturerId: integer('manufacturer_id').references(() => manufacturers.id),
    model: varchar('model', { length: 255 }),
    categoryId: integer('category_id').references(() => categories.id),
    primaryProtocol: protocolEnum('primary_protocol'),
    localControl: boolean('local_control'),
    cloudDependent: boolean('cloud_dependent'),
    requiresHub: boolean('requires_hub'),
    matterCertified: boolean('matter_certified'),
    imageUrl: text('image_url'),
    description: text('description'),
    primarySourceId: integer('primary_source_id').references((): AnyPgColumn => rawImports.id),
    manualOverrides: jsonb('manual_overrides').$type<Record<string, boolean>>().default({}),
    status: productStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    manufacturerIdx: index('products_manufacturer_idx').on(table.manufacturerId),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    protocolIdx: index('products_protocol_idx').on(table.primaryProtocol),
    statusIdx: index('products_status_idx').on(table.status),
  }),
)

export const productSources = pgTable(
  'product_sources',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    rawImportId: integer('raw_import_id')
      .references(() => rawImports.id, { onDelete: 'cascade' })
      .notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    mergeConfidence: mergeConfidenceEnum('merge_confidence').default('exact').notNull(),
    mergedAt: timestamp('merged_at').defaultNow().notNull(),
    mergedBy: varchar('merged_by', { length: 50 }).default('auto').notNull(),
    notes: text('notes'),
  },
  (table) => ({
    productIdx: index('product_sources_product_idx').on(table.productId),
    rawImportIdx: index('product_sources_raw_import_idx').on(table.rawImportId),
    uniqueLink: unique('product_sources_unique').on(table.productId, table.rawImportId),
  }),
)

export const deviceCompatibility = pgTable(
  'device_compatibility',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    hubId: integer('hub_id')
      .references(() => hubs.id)
      .notNull(),
    integrationName: varchar('integration_name', { length: 100 }),
    status: compatibilityStatusEnum('status').default('untested').notNull(),
    notes: text('notes'),
    source: varchar('source', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('compat_product_idx').on(table.productId),
    hubIdx: index('compat_hub_idx').on(table.hubId),
    uniqueCompat: unique('compat_unique').on(table.productId, table.hubId, table.integrationName),
  }),
)

export const zigbeeDetails = pgTable('zigbee_details', {
  productId: integer('product_id')
    .primaryKey()
    .references(() => products.id),
  ieeeManufacturer: varchar('ieee_manufacturer', { length: 255 }),
  modelId: varchar('model_id', { length: 255 }),
  endpoints: jsonb('endpoints').$type<Record<string, unknown>[]>(),
  exposes: jsonb('exposes').$type<Record<string, unknown>[]>(),
})

export const zwaveDetails = pgTable('zwave_details', {
  productId: integer('product_id')
    .primaryKey()
    .references(() => products.id),
  zwaveManufacturerId: varchar('zwave_manufacturer_id', { length: 10 }),
  productType: varchar('product_type', { length: 10 }),
  productIdHex: varchar('product_id_hex', { length: 10 }),
  frequency: zwaveFrequencyEnum('frequency'),
})

export const retailers = pgTable('retailers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  affiliateTag: varchar('affiliate_tag', { length: 255 }),
  regions: jsonb('regions').$type<string[]>().default([]),
})

export const productPrices = pgTable(
  'product_prices',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    retailerId: integer('retailer_id')
      .references(() => retailers.id)
      .notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    affiliateUrl: varchar('affiliate_url', { length: 2048 }),
    price: decimal('price', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('USD'),
    inStock: boolean('in_stock'),
    lastChecked: timestamp('last_checked'),
  },
  (table) => ({
    productIdx: index('prices_product_idx').on(table.productId),
  }),
)

// Relations
export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  products: many(products),
  hubs: many(hubs),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [products.manufacturerId],
    references: [manufacturers.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  primarySource: one(rawImports, {
    fields: [products.primarySourceId],
    references: [rawImports.id],
  }),
  sources: many(productSources),
  compatibility: many(deviceCompatibility),
  zigbeeDetails: one(zigbeeDetails, {
    fields: [products.id],
    references: [zigbeeDetails.productId],
  }),
  zwaveDetails: one(zwaveDetails, {
    fields: [products.id],
    references: [zwaveDetails.productId],
  }),
  prices: many(productPrices),
}))

export const productSourcesRelations = relations(productSources, ({ one }) => ({
  product: one(products, {
    fields: [productSources.productId],
    references: [products.id],
  }),
  rawImport: one(rawImports, {
    fields: [productSources.rawImportId],
    references: [rawImports.id],
  }),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, { relationName: 'categoryHierarchy' }),
  products: many(products),
}))

export const hubsRelations = relations(hubs, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [hubs.manufacturerId],
    references: [manufacturers.id],
  }),
  compatibility: many(deviceCompatibility),
}))

export const deviceCompatibilityRelations = relations(deviceCompatibility, ({ one }) => ({
  product: one(products, {
    fields: [deviceCompatibility.productId],
    references: [products.id],
  }),
  hub: one(hubs, {
    fields: [deviceCompatibility.hubId],
    references: [hubs.id],
  }),
}))

export const zigbeeDetailsRelations = relations(zigbeeDetails, ({ one }) => ({
  product: one(products, {
    fields: [zigbeeDetails.productId],
    references: [products.id],
  }),
}))

export const zwaveDetailsRelations = relations(zwaveDetails, ({ one }) => ({
  product: one(products, {
    fields: [zwaveDetails.productId],
    references: [products.id],
  }),
}))

export const retailersRelations = relations(retailers, ({ many }) => ({
  productPrices: many(productPrices),
}))

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
  retailer: one(retailers, {
    fields: [productPrices.retailerId],
    references: [retailers.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))
