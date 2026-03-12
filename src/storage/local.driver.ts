import { writeFile, readFile, unlink, mkdir, readdir, rename, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, resolve, sep } from 'path'
import type { StorageDriver, LocalStorageConfig } from './types'
import { logger } from '../lib/logger'

/**
 * Local filesystem storage driver
 * Stores files in a local directory (e.g., ./data/exports)
 */
export class LocalStorageDriver implements StorageDriver {
  private resolvedBasePath: string
  private basePath: string
  private publicUrlBase: string

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath
    this.resolvedBasePath = resolve(config.basePath)
    this.publicUrlBase = config.publicUrlBase ?? '/api/exports'
  }

  async write(key: string, data: string | object): Promise<string> {
    const filePath = this.resolveStoragePath(key)
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    // Ensure directory exists
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    // Write to a temp file first so readers never see a partially-written export.
    const tempFilePath = `${filePath}.tmp-${process.pid}-${Date.now()}`
    await writeFile(tempFilePath, content, 'utf-8')
    await rename(tempFilePath, filePath)
    logger.info(`File written to local storage: ${filePath}`)

    return this.getPublicUrl(key)
  }

  async read(key: string): Promise<string> {
    const filePath = this.resolveStoragePath(key)
    const content = await readFile(filePath, 'utf-8')
    return content
  }

  exists(key: string): Promise<boolean> {
    const filePath = this.resolveStoragePath(key)
    return Promise.resolve(existsSync(filePath))
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveStoragePath(key)
    if (existsSync(filePath)) {
      await unlink(filePath)
      logger.info(`File deleted from local storage: ${filePath}`)
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const searchPath = prefix ? this.resolveStoragePath(prefix) : this.resolvedBasePath

    if (!existsSync(searchPath)) {
      return []
    }

    const files = await readdir(searchPath, { recursive: true })
    const result: string[] = []

    for (const file of files) {
      const fullPath = join(searchPath, file.toString())
      const stats = await stat(fullPath)
      if (stats.isFile()) {
        // Return relative path from basePath
        const relativePath = prefix ? join(prefix, file.toString()) : file.toString()
        result.push(relativePath)
      }
    }

    return result
  }

  getPublicUrl(key: string): string {
    // Remove leading slash from key if present
    const cleanKey = key.startsWith('/') ? key.slice(1) : key
    // Ensure publicUrlBase ends with /
    const base = this.publicUrlBase.endsWith('/') ? this.publicUrlBase : `${this.publicUrlBase}/`
    return `${base}${cleanKey}`
  }

  private resolveStoragePath(key: string): string {
    const normalizedKey = key.startsWith('/') ? key.slice(1) : key
    const resolvedPath = resolve(this.resolvedBasePath, normalizedKey)

    if (
      resolvedPath !== this.resolvedBasePath &&
      !resolvedPath.startsWith(`${this.resolvedBasePath}${sep}`)
    ) {
      throw new Error(`Storage key resolves outside configured base path: ${key}`)
    }

    return resolvedPath
  }
}
