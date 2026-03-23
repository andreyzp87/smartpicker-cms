import { db } from '../src/db/client.js'
import { manufacturers, categories, hubs } from '../src/db/schema.js'
import slugify from 'slugify'
import { eq } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Starting database seeding...')

  try {
    // ============================================
    // 1. SEED MANUFACTURERS
    // ============================================
    console.log('\n📦 Seeding manufacturers...')

    const manufacturerData = [
      { name: 'Aqara', website: 'https://www.aqara.com' },
      { name: 'Philips Hue', website: 'https://www.philips-hue.com' },
      { name: 'IKEA', website: 'https://www.ikea.com' },
      { name: 'Sonoff', website: 'https://sonoff.tech' },
      { name: 'Tuya', website: 'https://www.tuya.com' },
      { name: 'Shelly', website: 'https://www.shelly.com' },
      { name: 'Zooz', website: 'https://www.getzooz.com' },
      { name: 'Inovelli', website: 'https://inovelli.com' },
      { name: 'Third Reality', website: 'https://www.thirdreality.com' },
      { name: 'Xiaomi', website: 'https://www.mi.com' },
      { name: 'Samsung SmartThings', website: 'https://www.smartthings.com' },
      { name: 'Eve', website: 'https://www.evehome.com' },
      { name: 'Lutron', website: 'https://www.lutron.com' },
      { name: 'Leviton', website: 'https://www.leviton.com' },
      { name: 'TP-Link', website: 'https://www.tp-link.com' },
      { name: 'Sengled', website: 'https://www.sengled.com' },
      { name: 'LIFX', website: 'https://www.lifx.com' },
      { name: 'Osram', website: 'https://www.osram.com' },
      { name: 'Fibaro', website: 'https://www.fibaro.com' },
      { name: 'Aeotec', website: 'https://aeotec.com' },
      { name: 'Qubino', website: 'https://qubino.com' },
      { name: 'Hue Essentials', website: null },
      { name: 'Yale', website: 'https://www.yalehome.com' },
      { name: 'August', website: 'https://august.com' },
      { name: 'Ring', website: 'https://ring.com' },
      { name: 'Nest', website: 'https://store.google.com/category/connected_home' },
      { name: 'Ecobee', website: 'https://www.ecobee.com' },
      { name: 'Honeywell', website: 'https://www.honeywell.com' },
      { name: 'SwitchBot', website: 'https://www.switch-bot.com' },
      { name: 'Yeelight', website: 'https://www.yeelight.com' },
      { name: 'Home Assistant', website: 'https://www.home-assistant.io' },
      { name: 'Hubitat', website: 'https://hubitat.com' },
      { name: 'Athom', website: 'https://athom.com' },
      { name: 'Amazon', website: 'https://www.amazon.com' },
      { name: 'Google', website: 'https://store.google.com' },
      { name: 'Apple', website: 'https://www.apple.com' },
    ]

    for (const mfg of manufacturerData) {
      const slug = slugify(mfg.name, { lower: true, strict: true })
      await db
        .insert(manufacturers)
        .values({
          slug,
          name: mfg.name,
          website: mfg.website,
          logoUrl: null,
        })
        .onConflictDoUpdate({
          target: manufacturers.slug,
          set: {
            name: mfg.name,
            website: mfg.website,
            updatedAt: new Date(),
          },
        })
    }
    console.log(`✓ Seeded ${manufacturerData.length} manufacturers`)

    // ============================================
    // 2. SEED CATEGORIES (WITH HIERARCHY)
    // ============================================
    console.log('\n📁 Seeding categories...')

    const categoryHierarchy = [
      {
        name: 'Sensors',
        children: [
          'Motion',
          'Door/Window',
          'Temperature',
          'Humidity',
          'Leak',
          'Smoke/CO',
          'Vibration',
          'Presence',
        ],
      },
      {
        name: 'Lighting',
        children: ['Bulbs', 'Switches', 'Dimmers', 'Controllers', 'LED Strips'],
      },
      {
        name: 'Climate',
        children: ['Thermostats', 'HVAC Controls', 'Fans', 'Air Quality Monitors'],
      },
      {
        name: 'Security',
        children: ['Cameras', 'Locks', 'Alarms', 'Doorbells', 'Sirens'],
      },
      {
        name: 'Actuators',
        children: ['Plugs', 'Relays', 'Valves', 'Motors'],
      },
      {
        name: 'Window Coverings',
        children: ['Blinds', 'Shades', 'Curtains'],
      },
      {
        name: 'Energy Management',
        children: ['Energy Monitors', 'Smart Meters', 'Solar Controllers'],
      },
      {
        name: 'Buttons & Remotes',
        children: ['Wireless Buttons', 'Scene Controllers', 'Remote Controls'],
      },
      {
        name: 'Other',
        children: ['Gateways', 'Repeaters', 'IR Blasters'],
      },
    ]

    let sortOrder = 0
    let categoriesCreated = 0

    for (const category of categoryHierarchy) {
      const parentSlug = slugify(category.name, { lower: true, strict: true })

      // Create parent category
      const [parent] = await db
        .insert(categories)
        .values({
          slug: parentSlug,
          name: category.name,
          parentId: null,
          sortOrder: sortOrder++,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            name: category.name,
            sortOrder: sortOrder - 1,
          },
        })
        .returning()

      categoriesCreated++

      // Create children
      if (category.children && category.children.length > 0) {
        let childSortOrder = 0
        for (const childName of category.children) {
          const childSlug = slugify(childName, { lower: true, strict: true })

          // Get parent ID if we didn't get it from insert (conflict case)
          let parentId = parent?.id
          if (!parentId) {
            const [existingParent] = await db
              .select()
              .from(categories)
              .where(eq(categories.slug, parentSlug))
              .limit(1)
            parentId = existingParent.id
          }

          await db
            .insert(categories)
            .values({
              slug: childSlug,
              name: childName,
              parentId,
              sortOrder: childSortOrder++,
            })
            .onConflictDoUpdate({
              target: categories.slug,
              set: {
                name: childName,
                parentId,
                sortOrder: childSortOrder - 1,
              },
            })

          categoriesCreated++
        }
      }
    }
    console.log(`✓ Seeded ${categoriesCreated} categories`)

    // ============================================
    // 3. SEED HUBS
    // ============================================
    console.log('\n🏠 Seeding hubs...')

    // Get manufacturer IDs
    const getManufacturerId = async (slug: string | null) => {
      if (!slug) return null

      const [mfg] = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.slug, slug))
        .limit(1)
      return mfg?.id || null
    }

    const hubData = [
      {
        name: 'Home Assistant (Generic)',
        manufacturerSlug: 'home-assistant',
        protocols: ['zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'],
        description: 'Open-source home automation platform with support for all major protocols',
      },
      {
        name: 'Home Assistant Yellow',
        manufacturerSlug: 'home-assistant',
        protocols: ['zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'],
        description: 'Official Home Assistant hardware with built-in Zigbee and Thread support',
      },
      {
        name: 'Home Assistant Green',
        manufacturerSlug: 'home-assistant',
        protocols: ['zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'],
        description: 'Compact Home Assistant device with USB radio support',
      },
      {
        name: 'SmartThings Hub v3',
        manufacturerSlug: 'samsung-smartthings',
        protocols: ['zigbee', 'zwave', 'wifi'],
        description: 'Samsung SmartThings hub with Zigbee and Z-Wave support',
      },
      {
        name: 'SmartThings Station',
        manufacturerSlug: 'samsung-smartthings',
        protocols: ['zigbee', 'matter', 'wifi', 'thread'],
        description: 'Latest SmartThings hub with Matter support',
      },
      {
        name: 'Hubitat Elevation',
        manufacturerSlug: 'hubitat',
        protocols: ['zigbee', 'zwave', 'wifi'],
        description: 'Local smart home hub with Zigbee and Z-Wave support',
      },
      {
        name: 'Homey Pro (2023)',
        manufacturerSlug: 'athom',
        protocols: ['zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'],
        description: 'All-in-one smart home hub with support for all major protocols',
      },
      {
        name: 'Amazon Echo (4th Gen)',
        manufacturerSlug: 'amazon',
        protocols: ['zigbee', 'matter', 'wifi', 'bluetooth'],
        description: 'Echo smart speaker with built-in Zigbee hub',
      },
      {
        name: 'Amazon Echo Plus',
        manufacturerSlug: 'amazon',
        protocols: ['zigbee', 'wifi', 'bluetooth'],
        description: 'Echo with built-in Zigbee smart home hub',
      },
      {
        name: 'Google Nest Hub (2nd Gen)',
        manufacturerSlug: 'google',
        protocols: ['matter', 'wifi', 'thread', 'bluetooth'],
        description: 'Smart display with Thread border router and Matter support',
      },
      {
        name: 'Apple HomePod mini',
        manufacturerSlug: 'apple',
        protocols: ['matter', 'wifi', 'thread', 'bluetooth'],
        description: 'Smart speaker with Thread border router and Matter support',
      },
      {
        name: 'deCONZ / Phoscon',
        manufacturerSlug: null,
        protocols: ['zigbee'],
        description: 'deCONZ and Phoscon Zigbee platform for community-reported compatibility data',
      },
      {
        name: 'Domoticz',
        manufacturerSlug: null,
        protocols: ['zigbee'],
        description: 'Domoticz smart home platform for community-reported compatibility data',
      },
      {
        name: 'ioBroker',
        manufacturerSlug: null,
        protocols: ['zigbee'],
        description: 'ioBroker smart home platform for community-reported compatibility data',
      },
      {
        name: 'SONOFF iHost',
        manufacturerSlug: 'sonoff',
        protocols: ['zigbee'],
        description: 'SONOFF iHost local smart home controller for community-reported compatibility data',
      },
    ]

    for (const hub of hubData) {
      const slug = slugify(hub.name, { lower: true, strict: true })
      const manufacturerId = await getManufacturerId(hub.manufacturerSlug)

      await db
        .insert(hubs)
        .values({
          slug,
          name: hub.name,
          manufacturerId,
          protocolsSupported: hub.protocols,
          description: hub.description,
        })
        .onConflictDoUpdate({
          target: hubs.slug,
          set: {
            name: hub.name,
            manufacturerId,
            protocolsSupported: hub.protocols,
            description: hub.description,
          },
        })
    }
    console.log(`✓ Seeded ${hubData.length} hubs`)

    console.log('\n✨ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

seed()
