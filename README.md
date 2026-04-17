# SmartPicker CMS

SmartPicker CMS is a TypeScript-based content management system for a smart home device compatibility database.

It combines:

- a Hono + tRPC backend API
- a React admin application served at `/admin`
- an import and processing pipeline for external device catalogs
- JSON export generation for a separate public-facing frontend

The public website itself is not implemented in this repository. This repo owns the CMS, data model, import pipeline, and export artifacts that power that site.

## What This Project Does

SmartPicker CMS helps manage smart home product data across manufacturers, categories, protocols, integrations, platforms, and commercial hubs.

Core capabilities include:

- importing raw device data from sources like Zigbee2MQTT, Blakadder, and Z-Wave JS
- transforming raw imports into normalized products and compatibility records
- reviewing and editing content in an admin UI
- deduplicating products
- generating versioned JSON exports for a separate frontend
- serving local export files from `/api/exports/*`

## Tech Stack

### Backend

- Node.js `>=24`
- TypeScript
- Hono
- tRPC v11
- Drizzle ORM
- PostgreSQL
- BullMQ
- Redis
- Zod
- Pino

### Admin App

- React 19
- Vite
- React Router 7
- TanStack React Query
- tRPC client
- React Hook Form
- Tailwind CSS v4
- Radix UI primitives

## Repository Structure

```text
.
├── admin/                  # React admin application
├── data/                   # Local generated/exported data
├── docs/                   # Internal project documentation
├── scripts/                # Utility and extraction scripts
├── src/
│   ├── db/                 # Drizzle schema, migrations, DB client
│   ├── deduplication/      # Duplicate detection and merge logic
│   ├── importers/          # External source importers
│   ├── jobs/               # Queue and worker scaffolding
│   ├── processors/         # Import normalization and backfills
│   ├── routes/             # tRPC routers
│   ├── services/           # Export service and related logic
│   └── storage/            # Local/S3 export storage drivers
├── docker-compose.yml      # Local Postgres + Redis
└── package.json
```

## Main Runtime Endpoints

- API: `http://localhost:3000/api/trpc`
- Health check: `http://localhost:3000/health`
- Admin UI: `http://localhost:3000/admin`
- Export files: `http://localhost:3000/api/exports`

In development, the backend usually runs on port `3000` and the Vite admin dev server runs on `5173`.

## Quick Start

### 1. Install dependencies

```bash
pnpm install
pnpm --dir admin install
```

### 2. Start local services

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `5432`
- Redis on `6379`

### 3. Configure environment variables

Copy the example env file and update values as needed:

```bash
cp .env.example .env
```

Important variables:

```env
DATABASE_URL=postgresql://smartpicker:development@localhost:5432/smartpicker
REDIS_URL=redis://localhost:6379
NODE_ENV=development
STORAGE_TYPE=local
EXPORTS_PATH=./data/exports
EXPORTS_URL_BASE=/api/exports
```

Optional for S3-backed export storage:

```env
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_PUBLIC_URL_BASE=
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Create an admin user

```bash
pnpm cli users:create --email admin@example.com --name Admin --password changeme123
```

### 6. Start the app

Backend API:

```bash
pnpm dev
```

Admin app in standalone Vite mode:

```bash
pnpm --dir admin dev
```

For frontend development, open the Vite app on `http://localhost:5173`.

To serve the built admin app from `http://localhost:3000/admin`, build the project and run the production server:

```bash
pnpm build
pnpm start
```

## Common Commands

### Development

```bash
pnpm dev
pnpm dev:worker
pnpm build
pnpm start
pnpm start:worker
```

### Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm check
```

### Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
pnpm db:seed
```

### Import and processing

```bash
pnpm cli import blakadder
pnpm cli import zigbee2mqtt
pnpm cli import zwave-js

pnpm cli process
pnpm cli backfill-categories
pnpm cli backfill-compatibility
pnpm cli backfill-compatibility-approvals
pnpm cli backfill-auto-publish
pnpm cli deduplicate --dry-run
```

### Exports

```bash
pnpm cli export --type all
pnpm cli export --type products
pnpm cli export --type all --limited
```

Supported export types:

- `products`
- `manufacturers`
- `categories`
- `integrations`
- `platforms`
- `hubs`
- `protocols`
- `catalog`
- `search`
- `all`

## Data Flow

The project is built around this pipeline:

1. External source data is fetched into `raw_imports`.
2. Processor logic transforms that data into normalized CMS entities.
3. Compatibility relationships and evidence are attached.
4. Editors review and manage records in the admin UI.
5. Published data is exported to JSON for the public frontend.

Only published records are intended for public export payloads.

## Admin Areas

The admin application includes screens for:

- dashboard
- products
- compatibility
- platforms
- integrations
- commercial hubs
- manufacturers
- categories
- imports
- exports
- users

## Export Storage

Exports can be written to:

- local disk via `data/exports`
- S3-compatible object storage

When `STORAGE_TYPE=local`, the server also exposes those files under `/api/exports/*`.

## Testing Notes

- Unit and component tests run with Vitest.
- Integration tests use Testcontainers with PostgreSQL.
- `pnpm test:integration` requires a working Docker runtime.

## Additional Documentation

- [Implementation reference](./docs/implementation-reference.md)
- [Export data contract](./docs/export-data-contract.md)

## Current Scope Notes

- The BullMQ worker exists, but the queue processing logic is still minimal/scaffolded.
- The public consumer website is a separate project and is not part of this repository.

## License

No license file is currently included in this repository.
