import { ExtractedProduct } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

/**
 * Extract product fields from Zigbee2MQTT raw data
 */
export function extractZigbee2mqtt(data: Record<string, unknown>): ExtractedProduct {
  const description = getString(data.description)
  const model = getString(data.model)
  const vendor = getString(data.vendor)

  return {
    name: description ?? model ?? 'Unknown Device',
    model: model ?? null,
    vendor: vendor ?? 'Unknown',
    description: description ?? null,
    protocol: 'zigbee',
    zigbeeDetails: {
      ieeeManufacturer: vendor,
      modelId: model,
      endpoints: getRecordArray(data.endpoints),
      exposes: getRecordArray(data.exposes),
    },
  }
}

/**
 * Extract product fields from Blakadder raw data
 */
export function extractBlakadder(data: Record<string, unknown>): ExtractedProduct {
  const title = getString(data.title)
  const model = getString(data.model)
  const vendor = getString(data.vendor)
  const zigbeeModel = getString(data.zigbeemodel)

  return {
    name: title ?? model ?? 'Unknown Device',
    model: model ?? null,
    vendor: vendor ?? 'Unknown',
    description: title ?? null,
    protocol: 'zigbee', // Blakadder is Zigbee-focused
    compatibleWith: getStringArray(data.compatible), // ["z2m", "zha", "z4d"]
    zigbeeDetails: {
      modelId: zigbeeModel ?? model,
    },
  }
}

/**
 * Extract product fields from Z-Wave JS raw data
 */
export function extractZwaveJs(data: Record<string, unknown>): ExtractedProduct {
  const label = getString(data.label)
  const description = getString(data.description)
  const manufacturer = getString(data.manufacturer)
  const manufacturerName = getString(data._manufacturerName)
  const manufacturerId = getString(data.manufacturerId)
  const manufacturerHex = getString(data._manufacturer_hex)

  const name = label ?? description ?? 'Unknown Device'
  const vendor = manufacturer ?? manufacturerName ?? 'Unknown'

  // Extract first device's product type and ID if available
  const firstDevice =
    Array.isArray(data.devices) && data.devices.length > 0 && isRecord(data.devices[0])
      ? data.devices[0]
      : null

  return {
    name: `${vendor} ${name}`,
    model: label ?? null,
    vendor,
    description: description ?? null,
    protocol: 'zwave',
    zwaveDetails: {
      zwaveManufacturerId: manufacturerId ?? manufacturerHex,
      productType: getString(firstDevice?.productType),
      productIdHex: getString(firstDevice?.productId),
      // Frequency can be inferred from firmware or device config if available
    },
  }
}

/**
 * Route to the appropriate extractor based on source
 */
export function extractProduct(source: string, data: Record<string, unknown>): ExtractedProduct {
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
