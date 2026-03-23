import {
  type AnyPgColumn,
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
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
  'proprietary',
  'multi',
])

export const productStatusEnum = pgEnum('product_status', ['draft', 'published', 'archived'])

export const compatibilityStatusEnum = pgEnum('compatibility_status', [
  'verified',
  'supported',
  'reported',
  'untested',
  'incompatible',
])

export const productRoleEnum = pgEnum('product_role', ['endpoint', 'infrastructure'])

export const integrationKindEnum = pgEnum('integration_kind', [
  'protocol_stack',
  'bridge',
  'native_component',
  'vendor_connector',
  'addon',
  'external_service',
])

export const platformKindEnum = pgEnum('platform_kind', ['open_platform', 'commercial_platform'])

export const hardwareRequirementTypeEnum = pgEnum('hardware_requirement_type', [
  'required',
  'recommended',
  'supported',
])

export const compatibilityTargetTypeEnum = pgEnum('compatibility_target_type', [
  'integration',
  'hub',
])

export const evidenceSourceEnum = pgEnum('evidence_source', [
  'zigbee2mqtt',
  'blakadder',
  'zwave_js',
  'manual',
  'imported_other',
])

export const reviewStateEnum = pgEnum('review_state', ['pending', 'approved', 'rejected'])

export const supportTypeEnum = pgEnum('support_type', ['native', 'addon', 'external', 'community'])

export const zwaveFrequencyEnum = pgEnum('zwave_frequency', ['us', 'eu', 'au', 'jp'])

export const mergeConfidenceEnum = pgEnum('merge_confidence', ['exact', 'high', 'medium', 'low'])

// Core tables
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
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
    productRole: productRoleEnum('product_role').default('endpoint').notNull(),
    localControl: boolean('local_control'),
    cloudDependent: boolean('cloud_dependent'),
    requiresHub: boolean('requires_hub'),
    matterCertified: boolean('matter_certified'),
    imageUrl: text('image_url'),
    description: text('description'),
    status: productStatusEnum('status').default('draft').notNull(),
    primarySourceId: integer('primary_source_id').references((): AnyPgColumn => rawImports.id),
    manualOverrides: jsonb('manual_overrides').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    manufacturerIdx: index('products_manufacturer_idx').on(table.manufacturerId),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    protocolIdx: index('products_protocol_idx').on(table.primaryProtocol),
    roleIdx: index('products_role_idx').on(table.productRole),
    statusIdx: index('products_status_idx').on(table.status),
  }),
)

export const platforms = pgTable(
  'platforms',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    kind: platformKindEnum('kind').notNull(),
    manufacturerId: integer('manufacturer_id').references(() => manufacturers.id),
    website: text('website'),
    description: text('description'),
    status: productStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    manufacturerIdx: index('platforms_manufacturer_idx').on(table.manufacturerId),
    statusIdx: index('platforms_status_idx').on(table.status),
  }),
)

export const integrations = pgTable(
  'integrations',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    integrationKind: integrationKindEnum('integration_kind').notNull(),
    primaryProtocol: protocolEnum('primary_protocol'),
    manufacturerId: integer('manufacturer_id').references(() => manufacturers.id),
    website: text('website'),
    description: text('description'),
    status: productStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    manufacturerIdx: index('integrations_manufacturer_idx').on(table.manufacturerId),
    protocolIdx: index('integrations_protocol_idx').on(table.primaryProtocol),
    statusIdx: index('integrations_status_idx').on(table.status),
  }),
)

export const commercialHubs = pgTable(
  'commercial_hubs',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    manufacturerId: integer('manufacturer_id').references(() => manufacturers.id),
    website: text('website'),
    description: text('description'),
    status: productStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    manufacturerIdx: index('commercial_hubs_manufacturer_idx').on(table.manufacturerId),
    statusIdx: index('commercial_hubs_status_idx').on(table.status),
  }),
)

export const platformIntegrations = pgTable(
  'platform_integrations',
  {
    id: serial('id').primaryKey(),
    platformId: integer('platform_id')
      .references(() => platforms.id, { onDelete: 'cascade' })
      .notNull(),
    integrationId: integer('integration_id')
      .references(() => integrations.id, { onDelete: 'cascade' })
      .notNull(),
    supportType: supportTypeEnum('support_type').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    platformIdx: index('platform_integrations_platform_idx').on(table.platformId),
    integrationIdx: index('platform_integrations_integration_idx').on(table.integrationId),
    uniqueLink: unique('platform_integrations_unique').on(table.platformId, table.integrationId),
  }),
)

export const integrationHardwareSupport = pgTable(
  'integration_hardware_support',
  {
    id: serial('id').primaryKey(),
    integrationId: integer('integration_id')
      .references(() => integrations.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    requirementType: hardwareRequirementTypeEnum('requirement_type').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    integrationIdx: index('integration_hardware_support_integration_idx').on(table.integrationId),
    productIdx: index('integration_hardware_support_product_idx').on(table.productId),
    uniqueLink: unique('integration_hardware_support_unique').on(table.integrationId, table.productId),
  }),
)

export const productIntegrationCompatibility = pgTable(
  'product_integration_compatibility',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    integrationId: integer('integration_id')
      .references(() => integrations.id, { onDelete: 'cascade' })
      .notNull(),
    status: compatibilityStatusEnum('status').notNull(),
    reviewState: reviewStateEnum('review_state').default('pending').notNull(),
    supportSummary: text('support_summary'),
    internalNotes: text('internal_notes'),
    canonicalSource: evidenceSourceEnum('canonical_source').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
    lastConfirmedAt: timestamp('last_confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('product_integration_compatibility_product_idx').on(table.productId),
    integrationIdx: index('product_integration_compatibility_integration_idx').on(table.integrationId),
    uniqueCompat: unique('product_integration_compatibility_unique').on(
      table.productId,
      table.integrationId,
    ),
  }),
)

export const productHubCompatibility = pgTable(
  'product_hub_compatibility',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    hubId: integer('hub_id')
      .references(() => commercialHubs.id, { onDelete: 'cascade' })
      .notNull(),
    status: compatibilityStatusEnum('status').notNull(),
    reviewState: reviewStateEnum('review_state').default('pending').notNull(),
    supportSummary: text('support_summary'),
    internalNotes: text('internal_notes'),
    canonicalSource: evidenceSourceEnum('canonical_source').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
    lastConfirmedAt: timestamp('last_confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index('product_hub_compatibility_product_idx').on(table.productId),
    hubIdx: index('product_hub_compatibility_hub_idx').on(table.hubId),
    uniqueCompat: unique('product_hub_compatibility_unique').on(table.productId, table.hubId),
  }),
)

export const compatibilityEvidence = pgTable(
  'compatibility_evidence',
  {
    id: serial('id').primaryKey(),
    targetType: compatibilityTargetTypeEnum('target_type').notNull(),
    productIntegrationCompatibilityId: integer('product_integration_compatibility_id').references(
      () => productIntegrationCompatibility.id,
      { onDelete: 'cascade' },
    ),
    productHubCompatibilityId: integer('product_hub_compatibility_id').references(
      () => productHubCompatibility.id,
      { onDelete: 'cascade' },
    ),
    source: evidenceSourceEnum('source').notNull(),
    sourceRecordKey: text('source_record_key').notNull(),
    assertedStatus: compatibilityStatusEnum('asserted_status').notNull(),
    note: text('note'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull(),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    integrationCompatIdx: index('compatibility_evidence_integration_idx').on(
      table.productIntegrationCompatibilityId,
    ),
    hubCompatIdx: index('compatibility_evidence_hub_idx').on(table.productHubCompatibilityId),
    uniqueEvidence: unique('compatibility_evidence_unique').on(
      table.source,
      table.sourceRecordKey,
      table.productIntegrationCompatibilityId,
      table.productHubCompatibilityId,
    ),
  }),
)

export const sourceCompatibilityMappings = pgTable(
  'source_compatibility_mappings',
  {
    id: serial('id').primaryKey(),
    source: varchar('source', { length: 50 }).notNull(),
    sourceCode: varchar('source_code', { length: 100 }).notNull(),
    targetType: compatibilityTargetTypeEnum('target_type').notNull(),
    targetKey: varchar('target_key', { length: 255 }).notNull(),
    integrationId: integer('integration_id').references(() => integrations.id, {
      onDelete: 'cascade',
    }),
    hubId: integer('hub_id').references(() => commercialHubs.id, {
      onDelete: 'cascade',
    }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceCodeIdx: index('source_compatibility_mappings_source_code_idx').on(
      table.source,
      table.sourceCode,
    ),
    integrationIdx: index('source_compatibility_mappings_integration_idx').on(table.integrationId),
    hubIdx: index('source_compatibility_mappings_hub_idx').on(table.hubId),
    uniqueMapping: unique('source_compatibility_mappings_unique').on(
      table.source,
      table.sourceCode,
      table.targetKey,
    ),
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
    mergedAt: timestamp('merged_at', { withTimezone: true }).defaultNow().notNull(),
    mergedBy: varchar('merged_by', { length: 50 }).default('auto').notNull(),
    notes: text('notes'),
  },
  (table) => ({
    productIdx: index('product_sources_product_idx').on(table.productId),
    rawImportIdx: index('product_sources_raw_import_idx').on(table.rawImportId),
    uniqueLink: unique('product_sources_unique').on(table.productId, table.rawImportId),
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
    lastChecked: timestamp('last_checked', { withTimezone: true }),
  },
  (table) => ({
    productIdx: index('prices_product_idx').on(table.productId),
  }),
)

// Relations
export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  products: many(products),
  platforms: many(platforms),
  integrations: many(integrations),
  commercialHubs: many(commercialHubs),
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

export const rawImportsRelations = relations(rawImports, ({ one, many }) => ({
  product: one(products, {
    fields: [rawImports.productId],
    references: [products.id],
  }),
  productLinks: many(productSources),
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
  integrationCompatibilities: many(productIntegrationCompatibility),
  hubCompatibilities: many(productHubCompatibility),
  hardwareSupport: many(integrationHardwareSupport),
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

export const platformsRelations = relations(platforms, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [platforms.manufacturerId],
    references: [manufacturers.id],
  }),
  platformIntegrations: many(platformIntegrations),
}))

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [integrations.manufacturerId],
    references: [manufacturers.id],
  }),
  platformIntegrations: many(platformIntegrations),
  hardwareSupport: many(integrationHardwareSupport),
  compatibility: many(productIntegrationCompatibility),
  sourceMappings: many(sourceCompatibilityMappings),
}))

export const commercialHubsRelations = relations(commercialHubs, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [commercialHubs.manufacturerId],
    references: [manufacturers.id],
  }),
  compatibility: many(productHubCompatibility),
  sourceMappings: many(sourceCompatibilityMappings),
}))

export const platformIntegrationsRelations = relations(platformIntegrations, ({ one }) => ({
  platform: one(platforms, {
    fields: [platformIntegrations.platformId],
    references: [platforms.id],
  }),
  integration: one(integrations, {
    fields: [platformIntegrations.integrationId],
    references: [integrations.id],
  }),
}))

export const integrationHardwareSupportRelations = relations(
  integrationHardwareSupport,
  ({ one }) => ({
    integration: one(integrations, {
      fields: [integrationHardwareSupport.integrationId],
      references: [integrations.id],
    }),
    product: one(products, {
      fields: [integrationHardwareSupport.productId],
      references: [products.id],
    }),
  }),
)

export const productIntegrationCompatibilityRelations = relations(
  productIntegrationCompatibility,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productIntegrationCompatibility.productId],
      references: [products.id],
    }),
    integration: one(integrations, {
      fields: [productIntegrationCompatibility.integrationId],
      references: [integrations.id],
    }),
    evidence: many(compatibilityEvidence, { relationName: 'productIntegrationEvidence' }),
  }),
)

export const productHubCompatibilityRelations = relations(
  productHubCompatibility,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productHubCompatibility.productId],
      references: [products.id],
    }),
    hub: one(commercialHubs, {
      fields: [productHubCompatibility.hubId],
      references: [commercialHubs.id],
    }),
    evidence: many(compatibilityEvidence, { relationName: 'productHubEvidence' }),
  }),
)

export const compatibilityEvidenceRelations = relations(compatibilityEvidence, ({ one }) => ({
  productIntegrationCompatibility: one(productIntegrationCompatibility, {
    fields: [compatibilityEvidence.productIntegrationCompatibilityId],
    references: [productIntegrationCompatibility.id],
    relationName: 'productIntegrationEvidence',
  }),
  productHubCompatibility: one(productHubCompatibility, {
    fields: [compatibilityEvidence.productHubCompatibilityId],
    references: [productHubCompatibility.id],
    relationName: 'productHubEvidence',
  }),
}))

export const sourceCompatibilityMappingsRelations = relations(
  sourceCompatibilityMappings,
  ({ one }) => ({
    integration: one(integrations, {
      fields: [sourceCompatibilityMappings.integrationId],
      references: [integrations.id],
    }),
    hub: one(commercialHubs, {
      fields: [sourceCompatibilityMappings.hubId],
      references: [commercialHubs.id],
    }),
  }),
)

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
