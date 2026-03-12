/**
 * Storage driver interface for storing exported data
 * Supports multiple backends (local filesystem, S3, etc.)
 */
export interface StorageDriver {
  /**
   * Write data to storage
   * @param key - Storage key/path (e.g., "products.json")
   * @param data - Data to write (will be stringified if object)
   * @returns Public URL or path to the stored file
   */
  write(key: string, data: string | object): Promise<string>

  /**
   * Read data from storage
   * @param key - Storage key/path
   * @returns The stored data as a string
   */
  read(key: string): Promise<string>

  /**
   * Check if a file exists in storage
   * @param key - Storage key/path
   */
  exists(key: string): Promise<boolean>

  /**
   * Delete a file from storage
   * @param key - Storage key/path
   */
  delete(key: string): Promise<void>

  /**
   * List all files in storage (optional)
   * @param prefix - Optional prefix to filter files
   */
  list(prefix?: string): Promise<string[]>

  /**
   * Get public URL for a stored file
   * @param key - Storage key/path
   */
  getPublicUrl(key: string): string
}

export interface LocalStorageConfig {
  type: 'local'
  basePath: string // e.g., "./data/exports"
  publicUrlBase?: string // e.g., "/api/exports" - for generating public URLs
}

export interface S3StorageConfig {
  type: 's3'
  bucket: string
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string // For S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
  publicUrlBase?: string // Custom domain/CDN URL
}

export type StorageConfig = LocalStorageConfig | S3StorageConfig
