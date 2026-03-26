import { describe, expect, it } from 'vitest'
import { generateMatchKey, matchKeyToString, matchKeysEqual, normalize } from './matcher'

describe('deduplication matcher helpers', () => {
  it('normalizes punctuation, whitespace, and casing', () => {
    expect(normalize(' Philips-Hue Bulb. ')).toBe('philipshuebulb')
  })

  it('returns null match keys when either side is missing', () => {
    expect(generateMatchKey('Philips', null)).toBeNull()
    expect(generateMatchKey('', 'LCT010')).toBeNull()
  })

  it('builds stable string keys and compares them', () => {
    const key1 = generateMatchKey('Philips', 'LCT-010')
    const key2 = generateMatchKey('philips', 'LCT010')

    expect(key1).not.toBeNull()
    expect(key2).not.toBeNull()
    expect(matchKeyToString(key1!)).toBe('philips___lct010')
    expect(matchKeysEqual(key1, key2)).toBe(true)
  })
})
