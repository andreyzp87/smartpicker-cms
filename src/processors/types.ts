export interface ExtractedProduct {
  name: string
  model: string | null
  vendor: string
  description: string | null
  protocol: 'zigbee' | 'zwave' | 'matter' | 'wifi' | 'thread' | 'bluetooth' | null
  compatibleWith?: string[] // For Blakadder data: ["z2m", "zha", "z4d"]
  zigbeeDetails?: {
    ieeeManufacturer?: string
    modelId?: string
    endpoints?: any[]
    exposes?: any[]
  }
  zwaveDetails?: {
    zwaveManufacturerId?: string
    productType?: string
    productIdHex?: string
    frequency?: 'us' | 'eu' | 'au' | 'jp'
  }
}

export interface ProcessResult {
  productId: number
  created: boolean
  compatibilityRecordsCreated: number
}
