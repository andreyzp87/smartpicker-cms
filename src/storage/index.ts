import type { StorageDriver, StorageConfig } from './types'
import { LocalStorageDriver } from './local.driver'
import { S3StorageDriver } from './s3.driver'

/**
 * Factory function to create a storage driver based on configuration
 */
export function createStorageDriver(config: StorageConfig): StorageDriver {
  switch (config.type) {
    case 'local':
      return new LocalStorageDriver(config)
    case 's3':
      return new S3StorageDriver(config)
    default:
      return assertNever(config)
  }
}

/**
 * Get storage configuration from environment variables
 */
export function getStorageConfig(): StorageConfig {
  const storageType = process.env.STORAGE_TYPE ?? 'local'

  if (storageType === 's3') {
    const bucket = process.env.S3_BUCKET?.trim()
    const region = process.env.S3_REGION?.trim() ?? 'us-east-1'

    if (!bucket) {
      throw new Error('S3 storage requires S3_BUCKET to be configured')
    }

    return {
      type: 's3',
      bucket,
      region,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT, // For S3-compatible services
      publicUrlBase: process.env.S3_PUBLIC_URL_BASE,
    }
  }

  // Default to local storage
  return {
    type: 'local',
    basePath: process.env.EXPORTS_PATH ?? './data/exports',
    publicUrlBase: process.env.EXPORTS_URL_BASE ?? '/api/exports',
  }
}

function assertNever(value: never): never {
  throw new Error(`Unknown storage driver type: ${String(value)}`)
}

// Export types and drivers
export * from './types'
export { LocalStorageDriver } from './local.driver'
export { S3StorageDriver } from './s3.driver'
