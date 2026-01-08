# SmartPicker — Smart Home Device Compatibility Database

## Project Summary

**Brand:** SmartPicker (smartpicker.io)

**Concept:** "PCPartPicker for Smart Home" — a data-driven compatibility database helping users find smart home devices that work with their hubs and ecosystems.

**Problem:** Smart home device compatibility information is scattered across forums, Reddit, manufacturer sites, and GitHub repos. No unified source exists.

**Target Audience (MVP):** Home Assistant users — technical, data-literate, underserved by current tools, strong community, 2M+ installations.

**Differentiation:** Data product, not content site. Compatibility engine with purchase intelligence.

---

## Business Model

### Revenue Streams (Prioritized)

1. **Affiliate links** — Amazon, AliExpress, regional retailers
2. **Price alerts** (future) — premium feature
3. **Data licensing** (future) — to retailers/manufacturers

### Success Metrics

| Timeframe | Visitors | Revenue | Other |
|-----------|----------|---------|-------|
| Month 1 | 1,000 | - | 50+ affiliate clicks |
| Month 3 | 10,000 | $50-200 | 100+ community contributions |
| Month 6 | 50,000 | $500+ | Recognized as go-to resource |

---

## Technical Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    smartpicker-cms (Single Repo)                        │
│                         Hetzner VPS                                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Hono Server (Node 24)                       │   │
│  │                                                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│  │  │     CLI     │  │    tRPC     │  │    Static Files         │ │   │
│  │  │  Commands   │  │   Router    │  │  (Admin SPA + exports)  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│         ┌────────────────────┼────────────────────┐                    │
│         ▼                    ▼                    ▼                    │
│  ┌─────────────┐    ┌───────────────┐    ┌───────────────┐            │
│  │  Drizzle    │    │    BullMQ     │    │    Redis      │            │
│  │ PostgreSQL  │    │    Workers    │    │    Cache      │            │
│  └─────────────┘    └───────────────┘    └───────────────┘            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Admin SPA (React 19)                         │   │
│  │              Built with Vite, served by Hono                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                              │                                          │
│                              ▼                                          │
│                    ┌───────────────────┐                               │
│                    │   JSON Exports    │                               │
│                    │  /api/exports/*   │                               │
│                    └───────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               │ Fetches JSON at build time
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 smartpicker-web (Separate Repo)                         │
│                     Cloudflare Pages                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Astro 5 Static Site                        │   │
│  │                                                                 │   │
│  │  • Device catalog pages (static)                                │   │
│  │  • Device detail pages (static)                                 │   │
│  │  • React islands for interactivity                              │   │
│  │  • Fetches data from CMS at build time                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Repository Strategy

| Repository | Contents | Deployment | URL |
|------------|----------|------------|-----|
| `smartpicker-cms` | Backend API + Admin UI | Hetzner VPS | cms.smartpicker.io |
| `smartpicker-web` | Public Astro frontend | Cloudflare Pages | smartpicker.io |

**Why Two Repos:**
- **Independent deployments** — Update frontend without touching backend
- **Simpler CI/CD** — No monorepo tooling needed
- **Clear ownership** — CMS is the data authority, web is presentation
- **Free frontend hosting** — Cloudflare Pages for static site
- **Different update cycles** — Content changes daily, frontend changes weekly

**Data Flow:**
1. CMS exports JSON to `/api/exports/` endpoint
2. Astro fetches JSON during build (or via webhook trigger)
3. Cloudflare Pages rebuilds and deploys static site

---

## Tech Stack

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Runtime | Node.js | 24.x | Stable, native TypeScript support |
| HTTP Server | Hono | ^4.7 | Ultrafast, serves both API and static |
| API Layer | tRPC | ^11.0 | End-to-end type safety |
| ORM | Drizzle | ^0.38 | SQL-like, no codegen, excellent JSONB |
| Database | PostgreSQL | 16 | Relational + JSONB flexibility |
| Cache/Queue | Redis + BullMQ | 7 / ^5.0 | Robust job processing |
| Admin UI | React + TanStack Query | 19 / ^5.0 | Direct control, no abstractions |
| Admin Components | shadcn/ui + TanStack Table | latest / ^8.0 | Lightweight, beautiful |
| Styling | Tailwind CSS | 4.0 | Utility-first, new engine |
| Validation | Zod | ^3.24 | TypeScript-first, tRPC integration |
| Frontend | Astro | ^5.0 | Static-first, free hosting |
| CLI | Commander.js | ^13.0 | Simple, well-documented |
| Scraping | Cheerio | ^1.0 | Lightweight HTML parsing |
| Build (Backend) | tsup + tsx | ^8.0 / ^4.19 | Fast builds, dev watching |
| Build (Admin) | Vite | ^6.0 | Fast HMR, optimized builds |

---

## Project Structure

### smartpicker-cms (Backend + Admin)

```
smartpicker-cms/
├── src/
│   ├── index.ts                  # Hono app entry
│   ├── worker.ts                 # BullMQ worker process
│   ├── cli.ts                    # Commander.js CLI entry
│   │
│   ├── db/
│   │   ├── client.ts             # Drizzle client
│   │   ├── schema.ts             # All table definitions
│   │   └── migrations/           # SQL migrations
│   │
│   ├── routes/                   # tRPC routers
│   │   ├── index.ts              # Root router + context
│   │   ├── trpc.ts               # tRPC instance, procedures
│   │   ├── products.ts
│   │   ├── manufacturers.ts
│   │   ├── categories.ts
│   │   ├── hubs.ts
│   │   ├── imports.ts
│   │   └── compatibility.ts
│   │
│   ├── jobs/
│   │   ├── queues.ts             # Queue definitions
│   │   ├── import.job.ts         # Data import handler
│   │   ├── process.job.ts        # Transform raw → products
│   │   ├── export.job.ts         # Generate JSON exports
│   │   └── scheduler.ts          # Cron setup
│   │
│   ├── importers/                # Data source importers
│   │   ├── types.ts
│   │   ├── zigbee2mqtt.ts
│   │   ├── blakadder.ts
│   │   └── zwave-js.ts
│   │
│   ├── lib/
│   │   ├── redis.ts              # Redis client
│   │   ├── auth.ts               # Session auth
│   │   ├── logger.ts             # Pino logger
│   │   └── errors.ts             # Error handling
│   │
│   └── shared/                   # Shared code (schemas, types, constants)
│       ├── schemas/
│       │   ├── product.ts
│       │   ├── manufacturer.ts
│       │   ├── category.ts
│       │   ├── hub.ts
│       │   ├── import.ts
│       │   └── index.ts
│       ├── types.ts              # Inferred from schemas
│       └── constants.ts          # Protocols, statuses, etc.
│
├── admin/                        # React SPA (built separately)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── trpc.ts           # tRPC client
│   │   │   └── utils.ts          # cn() helper
│   │   │
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   └── ...
│   │   │   ├── data-table.tsx
│   │   │   ├── json-viewer.tsx
│   │   │   ├── protocol-badge.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── layout/
│   │   │       ├── sidebar.tsx
│   │   │       ├── header.tsx
│   │   │       └── root-layout.tsx
│   │   │
│   │   └── pages/
│   │       ├── dashboard.tsx
│   │       ├── login.tsx
│   │       ├── products/
│   │       │   ├── index.tsx
│   │       │   ├── [id].tsx
│   │       │   └── new.tsx
│   │       ├── manufacturers/
│   │       │   ├── index.tsx
│   │       │   └── [id].tsx
│   │       ├── hubs/
│   │       │   ├── index.tsx
│   │       │   └── [id].tsx
│   │       ├── categories/
│   │       │   ├── index.tsx
│   │       │   └── [id].tsx
│   │       └── imports/
│   │           ├── index.tsx
│   │           └── [id].tsx
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json              # Admin dependencies
│
├── scripts/
│   ├── extract-z2m-devices.ts    # Extract Z2M data to JSON
│   └── seed-db.ts                # Seed dev database
│
├── data/
│   ├── sources/                  # Pre-extracted source data
│   │   ├── zigbee2mqtt.json
│   │   ├── blakadder.json
│   │   └── zwave-js.json
│   └── exports/                  # Generated JSON (gitignored)
│       ├── products.json
│       ├── products/
│       │   └── [slug].json
│       ├── manufacturers.json
│       ├── categories.json
│       └── hubs.json
│
├── drizzle.config.ts
├── tsup.config.ts
├── package.json
├── tsconfig.json
├── docker-compose.yml            # Local dev: postgres + redis
├── Dockerfile
└── .env.example
```

### smartpicker-web (Astro Frontend)

```
smartpicker-web/
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── devices/
│   │   │   ├── index.astro       # Catalog with filters
│   │   │   └── [slug].astro      # Device detail
│   │   ├── hubs/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── categories/
│   │   │   └── [slug].astro
│   │   └── manufacturers/
│   │       └── [slug].astro
│   │
│   ├── components/
│   │   ├── ui/                   # Copied from admin as needed
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   └── select.tsx
│   │   ├── islands/              # React islands (client:load)
│   │   │   ├── DeviceFilter.tsx
│   │   │   ├── SearchBox.tsx
│   │   │   └── PriceDisplay.tsx
│   │   ├── DeviceCard.astro
│   │   ├── ProtocolBadge.astro
│   │   ├── CompatibilityTable.astro
│   │   └── Pagination.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── DeviceLayout.astro
│   │
│   ├── lib/
│   │   ├── data.ts               # Fetch/load JSON data
│   │   └── utils.ts
│   │
│   └── styles/
│       └── global.css
│
├── public/
│   ├── favicon.ico
│   └── robots.txt
│
├── astro.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Data Flow Between Repos

### Export & Sync Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           smartpicker-cms                               │
│                                                                         │
│  1. Data changes (import, edit, process)                               │
│                    │                                                    │
│                    ▼                                                    │
│  2. Export job runs (scheduled or manual)                              │
│     bun run cli export                                                 │
│                    │                                                    │
│                    ▼                                                    │
│  3. JSON files generated in data/exports/                              │
│                    │                                                    │
│                    ▼                                                    │
│  4. Served via /api/exports/* endpoint                                 │
│     https://cms.smartpicker.io/api/exports/products.json               │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP fetch at build time
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          smartpicker-web                                │
│                                                                         │
│  5. Astro build fetches JSON                                           │
│     const products = await fetch(CMS_URL + '/api/exports/products.json')│
│                    │                                                    │
│                    ▼                                                    │
│  6. Static pages generated                                             │
│                    │                                                    │
│                    ▼                                                    │
│  7. Deployed to Cloudflare Pages                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Triggering Frontend Rebuilds

**Option A: Manual (MVP)**
```bash
# After export, manually trigger Cloudflare Pages rebuild
curl -X POST "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/YOUR_HOOK_ID"
```

**Option B: Webhook in export job**
```typescript
// src/jobs/export.job.ts
async function onExportComplete() {
  // Trigger Cloudflare Pages rebuild
  await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, { method: 'POST' })
}
```

**Option C: Scheduled rebuilds**
- Cloudflare Pages can rebuild on schedule (e.g., daily at 6 AM)
- Simple, no webhook setup needed

### Data Fetching in Astro

```typescript
// smartpicker-web/src/lib/data.ts
const CMS_URL = import.meta.env.CMS_URL || 'https://cms.smartpicker.io'

export async function getProducts() {
  const res = await fetch(`${CMS_URL}/api/exports/products.json`)
  return res.json()
}

export async function getProduct(slug: string) {
  const res = await fetch(`${CMS_URL}/api/exports/products/${slug}.json`)
  if (!res.ok) return null
  return res.json()
}

export async function getManufacturers() {
  const res = await fetch(`${CMS_URL}/api/exports/manufacturers.json`)
  return res.json()
}

// ... etc
```

```astro
---
// smartpicker-web/src/pages/devices/[slug].astro
import { getProduct, getProducts } from '../../lib/data'
import DeviceLayout from '../../layouts/DeviceLayout.astro'

export async function getStaticPaths() {
  const products = await getProducts()
  return products.map((p) => ({ params: { slug: p.slug } }))
}

const { slug } = Astro.params
const product = await getProduct(slug)

if (!product) {
  return Astro.redirect('/404')
}
---

<DeviceLayout title={product.name}>
  <h1>{product.name}</h1>
  <!-- ... -->
</DeviceLayout>
```

---

## Shared Code Strategy

### No Shared Package — Just Copy Types

Since repos are separate, we don't share code via npm packages. Instead:

**1. CMS exports types alongside JSON:**
```
/api/exports/
├── products.json
├── types.ts          # TypeScript types for the JSON
└── schema.json       # JSON Schema (optional)
```

**2. Web repo copies types manually (or via script):**
```bash
# scripts/sync-types.sh in smartpicker-web
curl -o src/types/cms.ts https://cms.smartpicker.io/api/exports/types.ts
```

**3. Or just define types locally in web repo:**
```typescript
// smartpicker-web/src/types/product.ts
export interface Product {
  id: number
  slug: string
  name: string
  manufacturer: { id: number; name: string; slug: string } | null
  // ... matches JSON structure
}
```

This is simpler than maintaining a shared package. At MVP scale, manual sync is fine.

---

## Database Schema

```typescript
// src/db/schema.ts
import { 
  pgTable, pgEnum, serial, varchar, text, boolean, 
  integer, timestamp, jsonb, decimal, index, unique 
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const protocolEnum = pgEnum('protocol', [
  'zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'
])

export const productStatusEnum = pgEnum('product_status', [
  'draft', 'published', 'archived'
])

export const compatibilityStatusEnum = pgEnum('compatibility_status', [
  'verified', 'reported', 'untested', 'incompatible'
])

export const zwaveFrequencyEnum = pgEnum('zwave_frequency', [
  'us', 'eu', 'au', 'jp'
])

// Tables
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
  parentId: integer('parent_id').references((): any => categories.id),
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

export const rawImports = pgTable('raw_imports', {
  id: serial('id').primaryKey(),
  source: varchar('source', { length: 50 }).notNull(),
  sourceId: varchar('source_id', { length: 255 }).notNull(),
  data: jsonb('data').notNull(),
  checksum: varchar('checksum', { length: 64 }),
  productId: integer('product_id').references(() => products.id),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  sourceIdx: index('raw_imports_source_idx').on(table.source),
  productIdx: index('raw_imports_product_idx').on(table.productId),
  sourceUnique: unique('raw_imports_source_unique').on(table.source, table.sourceId),
}))

export const products = pgTable('products', {
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
  primarySourceId: integer('primary_source_id').references(() => rawImports.id),
  manualOverrides: jsonb('manual_overrides').$type<Record<string, boolean>>().default({}),
  status: productStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  manufacturerIdx: index('products_manufacturer_idx').on(table.manufacturerId),
  categoryIdx: index('products_category_idx').on(table.categoryId),
  protocolIdx: index('products_protocol_idx').on(table.primaryProtocol),
  statusIdx: index('products_status_idx').on(table.status),
}))

export const deviceCompatibility = pgTable('device_compatibility', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  hubId: integer('hub_id').references(() => hubs.id).notNull(),
  integrationName: varchar('integration_name', { length: 100 }),
  status: compatibilityStatusEnum('status').default('untested').notNull(),
  notes: text('notes'),
  source: varchar('source', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  productIdx: index('compat_product_idx').on(table.productId),
  hubIdx: index('compat_hub_idx').on(table.hubId),
  uniqueCompat: unique('compat_unique').on(table.productId, table.hubId, table.integrationName),
}))

export const zigbeeDetails = pgTable('zigbee_details', {
  productId: integer('product_id').primaryKey().references(() => products.id),
  ieeeManufacturer: varchar('ieee_manufacturer', { length: 255 }),
  modelId: varchar('model_id', { length: 255 }),
  endpoints: jsonb('endpoints').$type<Record<string, unknown>[]>(),
  exposes: jsonb('exposes').$type<Record<string, unknown>[]>(),
})

export const zwaveDetails = pgTable('zwave_details', {
  productId: integer('product_id').primaryKey().references(() => products.id),
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

export const productPrices = pgTable('product_prices', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  retailerId: integer('retailer_id').references(() => retailers.id).notNull(),
  url: varchar('url', { length: 2048 }).notNull(),
  affiliateUrl: varchar('affiliate_url', { length: 2048 }),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  inStock: boolean('in_stock'),
  lastChecked: timestamp('last_checked'),
}, (table) => ({
  productIdx: index('prices_product_idx').on(table.productId),
}))

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
```

---

## Zod Schemas (Source of Truth for Validation)

```typescript
// src/shared/schemas/product.ts
import { z } from 'zod'

export const protocolSchema = z.enum([
  'zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'
])

export const productStatusSchema = z.enum(['draft', 'published', 'archived'])

export const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  manufacturerId: z.number().int().positive().optional().nullable(),
  model: z.string().max(255).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  primaryProtocol: protocolSchema.optional().nullable(),
  localControl: z.boolean().optional().nullable(),
  cloudDependent: z.boolean().optional().nullable(),
  requiresHub: z.boolean().optional().nullable(),
  matterCertified: z.boolean().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  status: productStatusSchema.default('draft'),
})

export const productUpdateSchema = productCreateSchema.partial()

export const productFilterSchema = z.object({
  search: z.string().optional(),
  protocol: protocolSchema.optional(),
  manufacturerId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: productStatusSchema.optional(),
  localControl: z.coerce.boolean().optional(),
  matterCertified: z.coerce.boolean().optional(),
})

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortField: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Inferred types
export type Protocol = z.infer<typeof protocolSchema>
export type ProductStatus = z.infer<typeof productStatusSchema>
export type ProductCreate = z.infer<typeof productCreateSchema>
export type ProductUpdate = z.infer<typeof productUpdateSchema>
export type ProductFilter = z.infer<typeof productFilterSchema>
export type Pagination = z.infer<typeof paginationSchema>
```

```typescript
// src/shared/schemas/index.ts
export * from './product'
export * from './manufacturer'
export * from './category'
export * from './hub'
export * from './import'
export * from './compatibility'
```

```typescript
// src/shared/constants.ts
export const PROTOCOLS = {
  zigbee: { name: 'Zigbee', color: 'yellow' },
  zwave: { name: 'Z-Wave', color: 'blue' },
  matter: { name: 'Matter', color: 'purple' },
  wifi: { name: 'WiFi', color: 'green' },
  thread: { name: 'Thread', color: 'orange' },
  bluetooth: { name: 'Bluetooth', color: 'cyan' },
} as const

export const PRODUCT_STATUSES = {
  draft: { name: 'Draft', color: 'gray' },
  published: { name: 'Published', color: 'green' },
  archived: { name: 'Archived', color: 'red' },
} as const

export const COMPATIBILITY_STATUSES = {
  verified: { name: 'Verified', color: 'green' },
  reported: { name: 'Reported', color: 'blue' },
  untested: { name: 'Untested', color: 'gray' },
  incompatible: { name: 'Incompatible', color: 'red' },
} as const
```

---

## Data Import Strategy

### External Data Extraction

Instead of runtime dependency on `zigbee-herdsman-converters`, extract data separately:

```typescript
// scripts/extract-z2m-devices.ts
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
execSync('npm install zigbee-herdsman-converters --no-save')

// Import and extract
const zhc = await import('zigbee-herdsman-converters')
const devices = zhc.definitions.map(d => ({
  vendor: d.vendor,
  model: d.model,
  description: d.description,
  exposes: d.exposes,
  // ... extract what we need
}))

writeFileSync('data/sources/zigbee2mqtt.json', JSON.stringify(devices, null, 2))
console.log(`Extracted ${devices.length} devices`)

// Cleanup
execSync('npm remove zigbee-herdsman-converters')
```

### Importer Architecture

```typescript
// src/importers/types.ts
export interface RawDevice {
  vendor: string
  model: string
  description?: string
  [key: string]: unknown
}

export interface ImportResult {
  source: string
  devices: RawDevice[]
  metadata: {
    fetchedAt: Date
    count: number
  }
}

export interface Importer {
  name: string
  fetch(): Promise<ImportResult>
}
```

```typescript
// src/importers/zigbee2mqtt.ts
import { readFile } from 'fs/promises'
import { Importer, ImportResult } from './types'

export const zigbee2mqttImporter: Importer = {
  name: 'zigbee2mqtt',
  
  async fetch(): Promise<ImportResult> {
    // Read from pre-extracted JSON
    const data = await readFile('data/sources/zigbee2mqtt.json', 'utf-8')
    const devices = JSON.parse(data)
    
    return {
      source: 'zigbee2mqtt',
      devices,
      metadata: {
        fetchedAt: new Date(),
        count: devices.length,
      },
    }
  },
}
```

---

## Background Jobs

```typescript
// src/jobs/queues.ts
import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'

const connection = { connection: redis }

export const importQueue = new Queue('imports', connection)
export const processQueue = new Queue('processing', connection)
export const exportQueue = new Queue('exports', connection)

export function createWorkers() {
  new Worker('imports', async (job) => {
    const { source } = job.data
    logger.info({ source }, 'Starting import')
    
    const importer = getImporter(source)
    const result = await importer.fetch()
    await storeRawImports(result)
    
    logger.info({ source, count: result.metadata.count }, 'Import complete')
  }, { ...connection, concurrency: 1 })

  new Worker('processing', async (job) => {
    const { importIds } = job.data
    logger.info({ count: importIds.length }, 'Processing imports')
    
    for (const id of importIds) {
      await transformImport(id)
    }
  }, { ...connection, concurrency: 3 })

  new Worker('exports', async (job) => {
    logger.info('Starting export')
    await generateExports()
    
    // Optionally trigger frontend rebuild
    if (process.env.CLOUDFLARE_DEPLOY_HOOK) {
      await fetch(process.env.CLOUDFLARE_DEPLOY_HOOK, { method: 'POST' })
    }
    
    logger.info('Export complete')
  }, { ...connection, concurrency: 1 })
}
```

```typescript
// src/jobs/scheduler.ts
import { importQueue, exportQueue } from './queues'

export async function setupSchedules() {
  // Daily imports at 3 AM UTC
  await importQueue.upsertJobScheduler('daily-zigbee2mqtt', 
    { pattern: '0 3 * * *' },
    { name: 'import', data: { source: 'zigbee2mqtt' } }
  )
  
  await importQueue.upsertJobScheduler('daily-blakadder',
    { pattern: '30 3 * * *' },
    { name: 'import', data: { source: 'blakadder' } }
  )
  
  await importQueue.upsertJobScheduler('daily-zwave-js',
    { pattern: '0 4 * * *' },
    { name: 'import', data: { source: 'zwave-js' } }
  )
  
  // Daily export at 5 AM UTC
  await exportQueue.upsertJobScheduler('daily-export',
    { pattern: '0 5 * * *' },
    { name: 'export', data: {} }
  )
}
```

---

## Package Dependencies

### smartpicker-cms/package.json

```json
{
  "name": "smartpicker-cms",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:worker": "tsx watch src/worker.ts",
    "build": "tsup && pnpm build:admin",
    "build:server": "tsup",
    "build:admin": "cd admin && pnpm build",
    "start": "node dist/index.js",
    "start:worker": "node dist/worker.js",
    "cli": "tsx src/cli.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "@hono/trpc-server": "^0.3.3",
    "@hono/node-server": "^1.13.0",
    "@trpc/server": "^11.0.0",
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.5",
    "bullmq": "^5.34.0",
    "ioredis": "^5.4.2",
    "zod": "^3.24.0",
    "commander": "^13.0.0",
    "slugify": "^1.6.6",
    "cheerio": "^1.0.0",
    "pino": "^9.6.0",
    "pino-pretty": "^13.0.0",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "tsup": "^8.3.5",
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0"
  }
}
```

### smartpicker-cms/tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'src/worker.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

### smartpicker-cms/admin/package.json

```json
{
  "name": "smartpicker-admin",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@tanstack/react-query": "^5.64.0",
    "@tanstack/react-query-devtools": "^5.64.0",
    "@tanstack/react-table": "^8.21.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.24.0",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.1",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

### smartpicker-web/package.json

```json
{
  "name": "smartpicker-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "sync-types": "curl -o src/types/cms.ts $CMS_URL/api/exports/types.ts"
  },
  "dependencies": {
    "astro": "^5.1.0",
    "@astrojs/react": "^4.1.0",
    "@astrojs/tailwind": "^6.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

---

## Deployment

### CMS Deployment (Hetzner VPS)

```dockerfile
# smartpicker-cms/Dockerfile
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

# Build server
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:server

# Build admin
FROM base AS admin-builder
WORKDIR /app
COPY admin/package.json admin/pnpm-lock.yaml ./admin/
RUN cd admin && pnpm install --frozen-lockfile
COPY admin ./admin
RUN cd admin && pnpm build

# Production image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy server build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules

# Copy admin build (served as static files)
COPY --from=admin-builder /app/admin/dist ./admin/dist

# Copy data sources
COPY data/sources ./data/sources

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml (Development)
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: smartpicker
      POSTGRES_USER: smartpicker
      POSTGRES_PASSWORD: development
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```yaml
# docker-compose.prod.yml (Production)
version: '3.8'

services:
  cms:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://smartpicker:${DB_PASSWORD}@postgres:5432/smartpicker
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
      - CLOUDFLARE_DEPLOY_HOOK=${CLOUDFLARE_DEPLOY_HOOK}
    depends_on:
      - postgres
      - redis

  worker:
    build: .
    command: node dist/worker.js
    environment:
      - DATABASE_URL=postgresql://smartpicker:${DB_PASSWORD}@postgres:5432/smartpicker
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: smartpicker
      POSTGRES_USER: smartpicker
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  postgres_data:
  redis_data:
  caddy_data:
```

```
# Caddyfile
cms.smartpicker.io {
    reverse_proxy cms:3000
}
```

### Web Deployment (Cloudflare Pages)

```bash
# In Cloudflare Pages dashboard:
# - Repository: smartpicker-web
# - Build command: pnpm build
# - Output directory: dist
# - Environment variable: CMS_URL=https://cms.smartpicker.io
```

---

## Hosting Costs

| Component | Provider | Cost |
|-----------|----------|------|
| CMS + DB + Redis | Hetzner VPS (CPX21) | €8-12/month |
| Frontend | Cloudflare Pages | Free |
| Domain | Cloudflare | ~€10/year |
| **Total** | | **~€10-15/month** |

---

## MVP Scope (4-5 Weeks)

### Week 1: CMS Foundation
- [ ] Project setup with Node 24
- [ ] Docker Compose for local dev
- [ ] Drizzle schema and migrations
- [ ] Hono server with tRPC
- [ ] Basic CRUD routers
- [ ] CLI skeleton with Commander.js

### Week 2: Admin UI
- [ ] Vite + React 19 + Tailwind 4 setup
- [ ] tRPC client + TanStack Query
- [ ] shadcn/ui components
- [ ] Layout with sidebar
- [ ] Product CRUD pages
- [ ] Manufacturer, Hub, Category pages

### Week 3: Data Import
- [ ] Data extraction scripts
- [ ] Importers for Zigbee2MQTT, Blakadder, Z-Wave JS
- [ ] CLI import commands
- [ ] BullMQ job processing
- [ ] Import review UI in admin
- [ ] JSON export endpoint

### Week 4: Frontend + Integration
- [ ] Astro project setup (separate repo)
- [ ] Data fetching from CMS
- [ ] Device catalog and detail pages
- [ ] React filter island
- [ ] Deploy CMS to Hetzner
- [ ] Deploy web to Cloudflare Pages

### Week 5: Polish
- [ ] Webhook for frontend rebuild
- [ ] SEO (meta tags, sitemap, structured data)
- [ ] Affiliate links integration
- [ ] Error handling and logging
- [ ] Documentation
- [ ] Testing and bug fixes

---

## Technical Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Node.js 24 | Stability, full ecosystem support |
| Repo structure | Two repos (CMS + Web) | Independent deploys, simpler CI/CD |
| HTTP Server | Hono | Fast, modern, serves API + static |
| API Layer | tRPC v11 | E2E type safety |
| ORM | Drizzle | SQL-like, lightweight |
| Database | PostgreSQL 16 | Relational + JSONB |
| Queue | BullMQ + Redis | Robust job processing |
| Admin UI | React 19 + TanStack | Direct control, no abstractions |
| Components | shadcn/ui | Beautiful, accessible |
| Styling | Tailwind CSS 4 | Fast builds, utility-first |
| Frontend | Astro 5 | Static-first, free hosting |
| Build | tsup + tsx | Fast, simple |
| Type sharing | Manual / export endpoint | Simple, no package publishing |
| Z2M Data | External extraction | No runtime dependency |

---

## Resolved Questions

| Question | Resolution |
|----------|------------|
| Domain name | smartpicker.io |
| Branding | SmartPicker with established visual identity |
| Repo structure | Two repos: smartpicker-cms, smartpicker-web |
| Primary affiliate network | Amazon Associates, research EU alternatives |
| Community contribution model | TBD post-MVP |

---

## References

### Data Sources
- **Zigbee2MQTT:** https://github.com/Koenkk/zigbee2mqtt
- **Blakadder Zigbee:** https://zigbee.blakadder.com
- **Z-Wave JS:** https://github.com/zwave-js/node-zwave-js

### Frameworks & Tools
- **Node.js:** https://nodejs.org/
- **Hono:** https://hono.dev/
- **tRPC:** https://trpc.io/
- **Drizzle ORM:** https://orm.drizzle.team/
- **TanStack Query:** https://tanstack.com/query
- **TanStack Table:** https://tanstack.com/table
- **React:** https://react.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Astro:** https://astro.build/
- **shadcn/ui:** https://ui.shadcn.com/
- **BullMQ:** https://docs.bullmq.io/

### Community
- **Home Assistant:** https://www.home-assistant.io/
- **Zigbee2MQTT:** https://www.zigbee2mqtt.io/
- **Z-Wave JS:** https://zwave-js.github.io/node-zwave-js/
