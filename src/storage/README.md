# Storage Drivers

This directory contains storage driver implementations for exporting data. The system supports multiple storage backends through a common interface.

## Architecture

The storage system uses a **Strategy Pattern** to allow switching between different storage backends (local filesystem, S3, etc.) without changing the export service code.

### Interface: `StorageDriver`

All storage drivers implement the `StorageDriver` interface with the following methods:

- `write(key, data)` - Write data to storage
- `read(key)` - Read data from storage
- `exists(key)` - Check if a file exists
- `delete(key)` - Delete a file
- `list(prefix?)` - List files (with optional prefix filter)
- `getPublicUrl(key)` - Get public URL for a file

## Available Drivers

### 1. Local Filesystem Driver (`LocalStorageDriver`)

Stores files in the local filesystem. Best for development and small deployments.

**Configuration (via environment variables):**

```bash
STORAGE_TYPE=local
EXPORTS_PATH=./data/exports
EXPORTS_URL_BASE=/api/exports
```

**Features:**
- ✅ Simple setup - no external dependencies
- ✅ Fast writes and reads
- ✅ Easy to debug (files are visible)
- ✅ Works without internet connection
- ⚠️ Limited scalability
- ⚠️ No CDN integration
- ⚠️ Single server only (not suitable for multi-instance deployments)

**Use Cases:**
- Development environments
- Single-server VPS deployments
- Internal tools

### 2. S3 Driver (`S3StorageDriver`)

Stores files in Amazon S3 or S3-compatible services (MinIO, DigitalOcean Spaces, Backblaze B2, Cloudflare R2, etc.).

**Configuration (via environment variables):**

```bash
STORAGE_TYPE=s3
S3_BUCKET=my-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Optional - for S3-compatible services
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_PUBLIC_URL_BASE=https://cdn.example.com
```

**Features:**
- ✅ Highly scalable
- ✅ Redundant and durable (99.999999999% durability)
- ✅ CDN integration (CloudFront, Cloudflare, etc.)
- ✅ Multi-region support
- ✅ Works with multiple application instances
- ⚠️ Requires AWS credentials or S3-compatible service
- ⚠️ Additional cost for storage and bandwidth
- ⚠️ Network latency for reads/writes

**Use Cases:**
- Production deployments
- Multi-instance/containerized applications
- High-traffic websites
- CDN-backed static assets
- Disaster recovery (cross-region replication)

## S3-Compatible Services

The S3 driver works with any S3-compatible object storage service:

### AWS S3
```bash
S3_BUCKET=my-bucket
S3_REGION=us-east-1
# Credentials via AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars
```

### DigitalOcean Spaces
```bash
S3_BUCKET=my-space
S3_REGION=nyc3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_ACCESS_KEY_ID=your-spaces-key
S3_SECRET_ACCESS_KEY=your-spaces-secret
S3_PUBLIC_URL_BASE=https://my-space.nyc3.cdn.digitaloceanspaces.com
```

### Cloudflare R2
```bash
S3_BUCKET=my-bucket
S3_REGION=auto
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key
S3_PUBLIC_URL_BASE=https://pub-xyz.r2.dev
```

### MinIO (Self-Hosted)
```bash
S3_BUCKET=exports
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

### Backblaze B2
```bash
S3_BUCKET=my-bucket
S3_REGION=us-west-002
S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
S3_ACCESS_KEY_ID=your-key-id
S3_SECRET_ACCESS_KEY=your-application-key
```

## Usage

### In Export Service

The export service automatically uses the configured storage driver:

```typescript
import { exportService } from '@/services/export.service'

// Generates products.json and stores it using configured driver
const result = await exportService.generateProductsExport()
console.log(`Exported to: ${result.url}`)
```

### Custom Storage Driver

To use a specific driver directly:

```typescript
import { LocalStorageDriver, S3StorageDriver } from '@/storage'

// Local storage
const localStorage = new LocalStorageDriver({
  type: 'local',
  basePath: './data/exports',
  publicUrlBase: '/api/exports',
})

await localStorage.write('test.json', { hello: 'world' })

// S3 storage
const s3Storage = new S3StorageDriver({
  type: 's3',
  bucket: 'my-bucket',
  region: 'us-east-1',
})

await s3Storage.write('test.json', { hello: 'world' })
```

## Creating a New Driver

To add support for a new storage backend:

1. Create a new file: `src/storage/your-driver.driver.ts`
2. Implement the `StorageDriver` interface
3. Add configuration type to `src/storage/types.ts`
4. Update factory in `src/storage/index.ts`
5. Update `getStorageConfig()` to handle new driver type

Example:

```typescript
import { StorageDriver, YourDriverConfig } from './types'

export class YourStorageDriver implements StorageDriver {
  constructor(config: YourDriverConfig) {
    // Initialize
  }

  async write(key: string, data: string | object): Promise<string> {
    // Implementation
  }

  // ... implement other methods
}
```

## Recommendations

### Development
Use **Local Storage** - fast, simple, no setup required.

### Production (Small/Medium)
Use **S3** with a CDN like CloudFront or Cloudflare for:
- Better performance (CDN edge caching)
- Lower server load
- Scalability

### Production (Large/High-Traffic)
Use **S3** with:
- CloudFront CDN
- Cross-region replication
- Lifecycle policies for old exports
- Versioning enabled

### Self-Hosted
Use **MinIO** if you need S3-compatible storage but want to self-host everything.

## Performance Considerations

### Local Storage
- Write: ~1-5ms (very fast)
- Read: ~1-5ms (very fast)
- Scales with disk I/O
- No network latency

### S3 Storage
- Write: ~50-200ms (network-dependent)
- Read: ~50-200ms without CDN, ~5-50ms with CDN
- Scales infinitely
- Network latency affects performance

## Cost Considerations

### Local Storage
- **Cost:** Storage on your server/VPS
- **Bandwidth:** Served from your server (can be expensive)
- **Typical:** $0-5/month (VPS storage)

### S3 Storage
- **Storage:** $0.023/GB/month (AWS S3 Standard)
- **Bandwidth:** $0.09/GB (first 10TB)
- **Requests:** $0.005/1000 PUT, $0.0004/1000 GET
- **CDN:** $0.085/GB with CloudFront (cheaper than direct serving)
- **Typical:** $5-50/month for moderate traffic

### S3-Compatible Alternatives (Cheaper)
- **Backblaze B2:** $0.005/GB storage, $0.01/GB egress (cheaper than S3)
- **Cloudflare R2:** $0.015/GB storage, **FREE egress** (best for high traffic)
- **DigitalOcean Spaces:** $5/month for 250GB + 1TB transfer
