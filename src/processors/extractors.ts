import { ExtractedProduct } from './types'

/**
 * Extract product fields from Zigbee2MQTT raw data
 */
export function extractZigbee2mqtt(data: any): ExtractedProduct {
  return {
    name: data.description || data.model || 'Unknown Device',
    model: data.model || null,
    vendor: data.vendor || 'Unknown',
    description: data.description || null,
    protocol: 'zigbee',
    zigbeeDetails: {
      ieeeManufacturer: data.vendor,
      modelId: data.model,
      endpoints: data.endpoints || [],
      exposes: data.exposes || [],
    },
  }
}

/**
 * Extract product fields from Blakadder raw data
 */
export function extractBlakadder(data: any): ExtractedProduct {
  return {
    name: data.title || data.model || 'Unknown Device',
    model: data.model || null,
    vendor: data.vendor || 'Unknown',
    description: data.title || null,
    protocol: 'zigbee', // Blakadder is Zigbee-focused
    compatibleWith: data.compatible || [], // ["z2m", "zha", "z4d"]
    zigbeeDetails: {
      modelId: data.zigbeemodel || data.model,
    },
  }
}

/**
 * Extract product fields from Z-Wave JS raw data
 */
export function extractZwaveJs(data: any): ExtractedProduct {
  const name = data.label || data.description || 'Unknown Device'
  const vendor = data.manufacturer || data._manufacturerName || 'Unknown'

  // Extract first device's product type and ID if available
  const firstDevice = Array.isArray(data.devices) && data.devices.length > 0 ? data.devices[0] : null

  return {
    name: `${vendor} ${name}`,
    model: data.label || null,
    vendor,
    description: data.description || null,
    protocol: 'zwave',
    zwaveDetails: {
      zwaveManufacturerId: data.manufacturerId || data._manufacturer_hex,
      productType: firstDevice?.productType,
      productIdHex: firstDevice?.productId,
      // Frequency can be inferred from firmware or device config if available
    },
  }
}

/**
 * Route to the appropriate extractor based on source
 */
export function extractProduct(source: string, data: any): ExtractedProduct {
  switch (source) {
    case 'zigbee2mqtt':
      return extractZigbee2mqtt(data)
    case 'blakadder':
      return extractBlakadder(data)
    case 'zwave-js':
      return extractZwaveJs(data)
    default:
      throw new Error(`Unknown source: ${source}`)
  }
}
