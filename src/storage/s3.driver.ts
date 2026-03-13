import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type { StorageDriver, S3StorageConfig } from './types'
import { logger } from '../lib/logger'

/**
 * S3 storage driver
 * Stores files in Amazon S3 or S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
 */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client
  private bucket: string
  private region: string
  private endpoint?: string
  private publicUrlBase?: string

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket
    this.region = config.region
    this.endpoint = config.endpoint
    this.publicUrlBase = config.publicUrlBase

    // Create S3 client
    this.client = new S3Client({
      region: config.region,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined, // Use default credential provider chain if not provided
      endpoint: config.endpoint, // For S3-compatible services
      forcePathStyle: !!config.endpoint, // Required for MinIO and some S3-compatible services
    })
  }

  async write(key: string, data: string | object): Promise<string> {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: key.endsWith('.json') ? 'application/json' : 'text/plain',
      // Optional: Make files public (remove if you want private files)
      // ACL: 'public-read',
    })

    await this.client.send(command)
    logger.info(`File uploaded to S3: s3://${this.bucket}/${key}`)

    return this.getPublicUrl(key)
  }

  async read(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const response = await this.client.send(command)

    if (!response.Body) {
      throw new Error(`Failed to read file from S3: ${key}`)
    }

    // Convert stream to string
    const content = await response.Body.transformToString()
    return content
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      await this.client.send(command)
      return true
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false
      }
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
    logger.info(`File deleted from S3: s3://${this.bucket}/${key}`)
  }

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = []
    let continuationToken: string | undefined

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })

      const response = await this.client.send(command)
      const pageKeys =
        response.Contents?.map((obj) => obj.Key).filter((key): key is string => !!key) ?? []

      keys.push(...pageKeys)
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)

    return keys
  }

  getPublicUrl(key: string): string {
    // If custom public URL base is provided, use it
    if (this.publicUrlBase) {
      const cleanKey = key.startsWith('/') ? key.slice(1) : key
      const base = this.publicUrlBase.endsWith('/') ? this.publicUrlBase : `${this.publicUrlBase}/`
      return `${base}${cleanKey}`
    }

    const cleanKey = key.startsWith('/') ? key.slice(1) : key

    // For S3-compatible endpoints we default to path-style URLs to match forcePathStyle.
    if (this.endpoint) {
      const endpointBase = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint
      return `${endpointBase}/${this.bucket}/${cleanKey}`
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${cleanKey}`
  }

  private isNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const errorWithMetadata = error as Error & {
      $metadata?: {
        httpStatusCode?: number
      }
    }

    return error.name === 'NotFound' || errorWithMetadata.$metadata?.httpStatusCode === 404
  }
}
