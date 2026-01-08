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
