import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { categories, products, rawImports } from '../db/schema'
import { logger } from '../lib/logger'
import { extractProduct } from './extractors'
import type { ExtractedProduct } from './types'

const BLAKADDER_CATEGORY_MAP: Record<string, string> = {
  bulb: 'bulbs',
  coordinator: 'gateways',
  cover: 'window-coverings',
  dimmer: 'dimmers',
  hvac: 'climate',
  light: 'lighting',
  lock: 'locks',
  misc: 'other',
  other: 'other',
  plug: 'plugs',
  remote: 'remote-controls',
  'remote, battery': 'remote-controls',
  router: 'repeaters',
  sensor: 'sensors',
  socket: 'plugs',
  switch: 'switches',
}

const CATEGORY_MATCHERS: { slug: string; keywords: string[] }[] = [
  { slug: 'doorbells', keywords: ['doorbell'] },
  { slug: 'cameras', keywords: ['camera', 'surveillance'] },
  { slug: 'sirens', keywords: ['siren'] },
  { slug: 'alarms', keywords: ['alarm'] },
  { slug: 'locks', keywords: [' lock', 'deadbolt', 'lever lock', 'smart lock'] },
  { slug: 'ir-blasters', keywords: ['ir blaster', 'infrared blaster'] },
  { slug: 'smart-meters', keywords: ['smart meter'] },
  { slug: 'solar-controllers', keywords: ['solar', 'photovoltaic', 'inverter'] },
  { slug: 'energy-monitors', keywords: ['energy monitor', 'power meter', 'electric meter'] },
  { slug: 'leak', keywords: ['leak', 'flood sensor', 'water sensor', 'water leak'] },
  { slug: 'smokeco', keywords: ['smoke', 'carbon monoxide', 'co detector', 'co alarm'] },
  { slug: 'presence', keywords: ['presence', 'occupancy', 'mmwave'] },
  { slug: 'motion', keywords: ['motion', 'pir sensor'] },
  { slug: 'doorwindow', keywords: ['door/window', 'door window', 'door sensor', 'window sensor', 'contact sensor'] },
  { slug: 'vibration', keywords: ['vibration', 'tilt sensor', 'shock sensor'] },
  { slug: 'temperature', keywords: ['temperature sensor', 'thermometer', 'temperature'] },
  { slug: 'humidity', keywords: ['humidity'] },
  { slug: 'air-quality-monitors', keywords: ['air quality', 'co2', 'voc', 'pm2.5', 'particulate'] },
  { slug: 'fans', keywords: [' fan', 'ceiling fan', 'fan control'] },
  { slug: 'thermostats', keywords: ['thermostat', 'thermostatic', 'trv', 'radiator', 'heating setpoint'] },
  { slug: 'hvac-controls', keywords: ['hvac', 'boiler', 'air conditioner', 'floor heating'] },
  { slug: 'curtains', keywords: ['curtain'] },
  { slug: 'shades', keywords: ['shade'] },
  { slug: 'blinds', keywords: ['blind', 'roller shutter'] },
  { slug: 'valves', keywords: ['water valve', 'gas valve', 'shutoff valve', 'sprinkler valve', 'irrigation valve'] },
  { slug: 'motors', keywords: ['motor', 'actuator motor'] },
  { slug: 'plugs', keywords: ['plug', 'socket', 'outlet', 'receptacle', 'appliance module'] },
  { slug: 'relays', keywords: ['relay', 'dry contact', 'contact fixture module'] },
  { slug: 'led-strips', keywords: ['led strip', 'lightstrip', 'strip light'] },
  {
    slug: 'bulbs',
    keywords: [
      'bulb',
      'lamp',
      'e27',
      'e26',
      'e14',
      'gu10',
      'mr16',
      'downlight',
      'led panel',
      'candle',
      'ceiling light',
    ],
  },
  { slug: 'dimmers', keywords: ['dimmer'] },
  { slug: 'scene-controllers', keywords: ['scene controller'] },
  { slug: 'wireless-buttons', keywords: ['button', 'push button'] },
  { slug: 'remote-controls', keywords: ['remote', 'wall controller', 'handheld controller'] },
  { slug: 'sensors', keywords: ['multi sensor', 'room sensor', 'sensor', 'detector'] },
  { slug: 'switches', keywords: ['switch', 'wall switch', 'toggle switch'] },
  { slug: 'controllers', keywords: ['controller', 'pool control', 'channel module'] },
  { slug: 'repeaters', keywords: ['repeater', 'router'] },
  {
    slug: 'gateways',
    keywords: ['gateway', 'coordinator', 'bridge', 'usb controller', 'usb stick', 'quickstick', 'hometroller', 'hub'],
  },
]

const SOURCE_FALLBACKS: Record<string, string[]> = {
  blakadder: ['other'],
  'zigbee2mqtt': ['other'],
  'zwave-js': ['other'],
}

let categoryIdBySlugPromise: Promise<Map<string, number>> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item))
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectStrings(item))
  }

  return []
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)))
}

function resolveBlakadderBaseSlug(data: Record<string, unknown>): string | null {
  const category = typeof data.category === 'string' ? data.category.toLowerCase().trim() : null
  if (!category) {
    return null
  }

  return BLAKADDER_CATEGORY_MAP[category] ?? null
}

function buildSearchText(source: string, data: Record<string, unknown>, extracted: ExtractedProduct): string {
  const baseStrings = [
    source,
    extracted.name,
    extracted.model,
    extracted.vendor,
    extracted.description,
    typeof data.title === 'string' ? data.title : null,
    typeof data.description === 'string' ? data.description : null,
    typeof data.label === 'string' ? data.label : null,
    typeof data.category === 'string' ? data.category : null,
  ]

  const nestedStrings = collectStrings(data.exposes).slice(0, 200)
  const values = [...baseStrings, ...nestedStrings].filter((value): value is string => Boolean(value))

  return normalizeText(values.join(' '))
}

export function resolveCategorySlugForImport(
  source: string,
  data: Record<string, unknown>,
  extracted: ExtractedProduct,
): string | null {
  const searchText = buildSearchText(source, data, extracted)

  for (const matcher of CATEGORY_MATCHERS) {
    if (includesAny(searchText, matcher.keywords)) {
      return matcher.slug
    }
  }

  const sourceBaseSlug = source === 'blakadder' ? resolveBlakadderBaseSlug(data) : null
  if (sourceBaseSlug) {
    return sourceBaseSlug
  }

  const fallbacks = SOURCE_FALLBACKS[source] ?? []
  return fallbacks[0] ?? null
}

async function getCategoryIdBySlug(): Promise<Map<string, number>> {
  if (!categoryIdBySlugPromise) {
    categoryIdBySlugPromise = db
      .select({
        id: categories.id,
        slug: categories.slug,
      })
      .from(categories)
      .then((rows) => new Map(rows.map((row) => [row.slug, row.id])))
  }

  return categoryIdBySlugPromise
}

export async function resolveCategoryIdForImport(
  source: string,
  data: Record<string, unknown>,
  extracted: ExtractedProduct,
): Promise<number | null> {
  const categorySlug = resolveCategorySlugForImport(source, data, extracted)
  if (!categorySlug) {
    return null
  }

  const categoryIdBySlug = await getCategoryIdBySlug()
  const categoryId = categoryIdBySlug.get(categorySlug) ?? null

  if (!categoryId) {
    logger.warn({ categorySlug, source }, 'Category slug not found in database')
  }

  return categoryId
}

export async function backfillCategories(): Promise<{
  processed: number
  categorized: number
  skipped: number
}> {
  const rows = await db
    .select({
      productId: products.id,
      source: rawImports.source,
      data: rawImports.data,
      categoryId: products.categoryId,
    })
    .from(products)
    .innerJoin(rawImports, eq(products.primarySourceId, rawImports.id))

  let categorized = 0
  let skipped = 0

  for (const row of rows) {
    if (row.categoryId !== null) {
      skipped += 1
      continue
    }

    if (!isRecord(row.data)) {
      skipped += 1
      continue
    }

    const extracted = extractProduct(row.source, row.data)
    const categoryId = await resolveCategoryIdForImport(row.source, row.data, extracted)

    if (!categoryId) {
      skipped += 1
      continue
    }

    await db
      .update(products)
      .set({
        categoryId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, row.productId))

    categorized += 1
  }

  return {
    processed: rows.length,
    categorized,
    skipped,
  }
}
