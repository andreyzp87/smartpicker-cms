import { describe, expect, it } from 'vitest'
import {
  extractBlakadder,
  extractProduct,
  extractZigbee2mqtt,
  extractZwaveJs,
} from './extractors'

describe('extractZigbee2mqtt', () => {
  it('maps zigbee2mqtt payloads into the shared product shape', () => {
    const result = extractZigbee2mqtt({
      description: 'Hue Bulb',
      model: 'LCT010',
      vendor: 'Philips',
      endpoints: [{ ID: 1 }],
      exposes: [{ type: 'light' }],
    })

    expect(result).toEqual({
      name: 'Hue Bulb',
      model: 'LCT010',
      vendor: 'Philips',
      description: 'Hue Bulb',
      protocol: 'zigbee',
      zigbeeDetails: {
        ieeeManufacturer: 'Philips',
        modelId: 'LCT010',
        endpoints: [{ ID: 1 }],
        exposes: [{ type: 'light' }],
      },
    })
  })

  it('falls back to unknown values when optional fields are missing', () => {
    const result = extractZigbee2mqtt({})

    expect(result.name).toBe('Unknown Device')
    expect(result.vendor).toBe('Unknown')
    expect(result.model).toBeNull()
  })
})

describe('extractBlakadder', () => {
  it('normalizes compatible values whether they arrive as a string or array', () => {
    const single = extractBlakadder({
      title: 'Smart Plug',
      compatible: 'z2m',
    })
    const multi = extractBlakadder({
      title: 'Smart Plug',
      compatible: ['z2m', 'zha', 42],
    })

    expect(single.compatibleWith).toEqual(['z2m'])
    expect(multi.compatibleWith).toEqual(['z2m', 'zha'])
  })
})

describe('extractZwaveJs', () => {
  it('uses manufacturer metadata and the first device entry for zwave details', () => {
    const result = extractZwaveJs({
      label: 'Motion Sensor',
      description: 'Battery motion sensor',
      _manufacturerName: 'Aeotec',
      manufacturerId: '0x0086',
      devices: [
        {
          productType: '0x0002',
          productId: '0x0064',
        },
      ],
    })

    expect(result).toEqual({
      name: 'Aeotec Motion Sensor',
      model: 'Motion Sensor',
      vendor: 'Aeotec',
      description: 'Battery motion sensor',
      protocol: 'zwave',
      zwaveDetails: {
        zwaveManufacturerId: '0x0086',
        productType: '0x0002',
        productIdHex: '0x0064',
      },
    })
  })
})

describe('extractProduct', () => {
  it('routes to the correct extractor for known sources', () => {
    expect(extractProduct('blakadder', { title: 'Switch' }).protocol).toBe('zigbee')
    expect(extractProduct('zwave-js', { label: 'Sensor' }).protocol).toBe('zwave')
  })

  it('throws for unknown sources', () => {
    expect(() => extractProduct('other', {})).toThrow('Unknown source: other')
  })
})
