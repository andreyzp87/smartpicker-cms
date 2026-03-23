import { db } from '../src/db/client.js'
import {
  categories,
  commercialHubs,
  integrationHardwareSupport,
  integrations,
  manufacturers,
  platformIntegrations,
  platforms,
  products,
} from '../src/db/schema.js'
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
    // ============================================
    // 3. SEED PLATFORMS, INTEGRATIONS, AND COMMERCIAL HUBS
    // ============================================
    console.log('\n🧩 Seeding schema entities...')

    const getCategoryId = async (slug: string) => {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1)
      return category?.id || null
    }

    const getPlatformId = async (slug: string) => {
      const [platform] = await db.select().from(platforms).where(eq(platforms.slug, slug)).limit(1)
      return platform?.id || null
    }

    const getIntegrationId = async (slug: string) => {
      const [integration] = await db
        .select()
        .from(integrations)
        .where(eq(integrations.slug, slug))
        .limit(1)
      return integration?.id || null
    }

    const platformData = [
      {
        slug: 'home-assistant',
        name: 'Home Assistant',
        kind: 'open_platform' as const,
        manufacturerSlug: 'home-assistant',
        website: 'https://www.home-assistant.io',
        description: 'Open-source home automation platform.',
      },
      {
        slug: 'openhab',
        name: 'OpenHAB',
        kind: 'open_platform' as const,
        manufacturerSlug: null,
        website: 'https://www.openhab.org',
        description: 'Open-source smart home platform.',
      },
      {
        slug: 'domoticz',
        name: 'Domoticz',
        kind: 'open_platform' as const,
        manufacturerSlug: null,
        website: 'https://www.domoticz.com',
        description:
          'Open-source home automation platform with community Zigbee and Z-Wave integrations.',
      },
      {
        slug: 'homey',
        name: 'Homey',
        kind: 'commercial_platform' as const,
        manufacturerSlug: 'athom',
        website: 'https://homey.app',
        description: 'Commercial smart home platform by Athom.',
      },
      {
        slug: 'iobroker',
        name: 'ioBroker',
        kind: 'open_platform' as const,
        manufacturerSlug: null,
        website: 'https://www.iobroker.net',
        description: 'Open-source automation platform with adapter-based integrations.',
      },
    ]

    for (const platform of platformData) {
      const manufacturerId = await getManufacturerId(platform.manufacturerSlug)

      await db
        .insert(platforms)
        .values({
          slug: platform.slug,
          name: platform.name,
          kind: platform.kind,
          manufacturerId,
          website: platform.website,
          description: platform.description,
          status: 'published',
        })
        .onConflictDoUpdate({
          target: platforms.slug,
          set: {
            name: platform.name,
            kind: platform.kind,
            manufacturerId,
            website: platform.website,
            description: platform.description,
            status: 'published',
            updatedAt: new Date(),
          },
        })
    }

    const integrationData = [
      {
        slug: 'zigbee2mqtt',
        name: 'Zigbee2MQTT',
        integrationKind: 'protocol_stack' as const,
        primaryProtocol: 'zigbee' as const,
        manufacturerSlug: null,
        website: 'https://www.zigbee2mqtt.io',
        description: 'MQTT-based Zigbee integration.',
      },
      {
        slug: 'zha',
        name: 'ZHA',
        integrationKind: 'native_component' as const,
        primaryProtocol: 'zigbee' as const,
        manufacturerSlug: 'home-assistant',
        website: 'https://www.home-assistant.io/integrations/zha/',
        description: 'Native Zigbee integration for Home Assistant.',
      },
      {
        slug: 'deconz',
        name: 'deCONZ',
        integrationKind: 'bridge' as const,
        primaryProtocol: 'zigbee' as const,
        manufacturerSlug: null,
        website: 'https://phoscon.de/en/conbee2/software',
        description: 'deCONZ/Phoscon integration.',
      },
      {
        slug: 'zwave-js',
        name: 'Z-Wave JS',
        integrationKind: 'protocol_stack' as const,
        primaryProtocol: 'zwave' as const,
        manufacturerSlug: null,
        website: 'https://zwave-js.github.io',
        description: 'Open-source Z-Wave software stack.',
      },
      {
        slug: 'iobroker-zigbee',
        name: 'ioBroker Zigbee',
        integrationKind: 'addon' as const,
        primaryProtocol: 'zigbee' as const,
        manufacturerSlug: null,
        website: 'https://github.com/ioBroker/ioBroker.zigbee',
        description: 'ioBroker Zigbee integration imported from Blakadder compatibility data.',
      },
      {
        slug: 'tasmota',
        name: 'Tasmota',
        integrationKind: 'bridge' as const,
        primaryProtocol: 'zigbee' as const,
        manufacturerSlug: null,
        website: 'https://tasmota.github.io/docs/Zigbee/',
        description:
          'Tasmota Zigbee bridge and device integration imported from Blakadder compatibility data.',
      },
    ]

    for (const integration of integrationData) {
      const manufacturerId = await getManufacturerId(integration.manufacturerSlug)

      await db
        .insert(integrations)
        .values({
          slug: integration.slug,
          name: integration.name,
          integrationKind: integration.integrationKind,
          primaryProtocol: integration.primaryProtocol,
          manufacturerId,
          website: integration.website,
          description: integration.description,
          status: 'published',
        })
        .onConflictDoUpdate({
          target: integrations.slug,
          set: {
            name: integration.name,
            integrationKind: integration.integrationKind,
            primaryProtocol: integration.primaryProtocol,
            manufacturerId,
            website: integration.website,
            description: integration.description,
            status: 'published',
            updatedAt: new Date(),
          },
        })
    }

    const commercialHubData = [
      {
        slug: 'smartthings',
        name: 'SmartThings Hub',
        manufacturerSlug: 'samsung-smartthings',
        website: 'https://www.smartthings.com',
        description: 'Samsung SmartThings commercial hub ecosystem.',
      },
      {
        slug: 'hubitat',
        name: 'Hubitat Elevation',
        manufacturerSlug: 'hubitat',
        website: 'https://hubitat.com',
        description: 'Hubitat local automation hub.',
      },
      {
        slug: 'aqara-hub',
        name: 'Aqara Hub',
        manufacturerSlug: 'aqara',
        website: 'https://www.aqara.com',
        description: 'Aqara commercial smart home hub.',
      },
    ]

    for (const hub of commercialHubData) {
      const manufacturerId = await getManufacturerId(hub.manufacturerSlug)

      await db
        .insert(commercialHubs)
        .values({
          slug: hub.slug,
          name: hub.name,
          manufacturerId,
          website: hub.website,
          description: hub.description,
          status: 'published',
        })
        .onConflictDoUpdate({
          target: commercialHubs.slug,
          set: {
            name: hub.name,
            manufacturerId,
            website: hub.website,
            description: hub.description,
            status: 'published',
            updatedAt: new Date(),
          },
        })
    }

    const platformIntegrationData = [
      {
        platformSlug: 'home-assistant',
        integrationSlug: 'zigbee2mqtt',
        supportType: 'addon' as const,
        notes: 'Common Home Assistant deployment path for Zigbee2MQTT.',
      },
      {
        platformSlug: 'home-assistant',
        integrationSlug: 'zha',
        supportType: 'native' as const,
        notes: null,
      },
      {
        platformSlug: 'home-assistant',
        integrationSlug: 'zwave-js',
        supportType: 'addon' as const,
        notes: null,
      },
      {
        platformSlug: 'domoticz',
        integrationSlug: 'zigbee2mqtt',
        supportType: 'addon' as const,
        notes: 'Community-supported Zigbee2MQTT deployment path for Domoticz.',
      },
      {
        platformSlug: 'openhab',
        integrationSlug: 'zwave-js',
        supportType: 'addon' as const,
        notes: 'Z-Wave JS is used as the Z-Wave backend for OpenHAB.',
      },
      {
        platformSlug: 'iobroker',
        integrationSlug: 'iobroker-zigbee',
        supportType: 'addon' as const,
        notes: 'Official ioBroker Zigbee adapter for coordinator-backed Zigbee support.',
      },
    ]

    for (const link of platformIntegrationData) {
      const platformId = await getPlatformId(link.platformSlug)
      const integrationId = await getIntegrationId(link.integrationSlug)

      if (!platformId || !integrationId) continue

      await db
        .insert(platformIntegrations)
        .values({
          platformId,
          integrationId,
          supportType: link.supportType,
          notes: link.notes,
        })
        .onConflictDoUpdate({
          target: [platformIntegrations.platformId, platformIntegrations.integrationId],
          set: {
            supportType: link.supportType,
            notes: link.notes,
            updatedAt: new Date(),
          },
        })
    }

    const gatewaysCategoryId = await getCategoryId('gateways')
    const infrastructureProducts = [
      {
        slug: 'sonoff-zbdongle-p',
        name: 'SONOFF ZBDongle-P',
        manufacturerSlug: 'sonoff',
        model: 'ZBDongle-P',
        primaryProtocol: 'zigbee' as const,
        description: 'Popular Zigbee coordinator USB dongle.',
      },
      {
        slug: 'skyconnect',
        name: 'Home Assistant SkyConnect',
        manufacturerSlug: 'home-assistant',
        model: 'SkyConnect',
        primaryProtocol: 'multi' as const,
        description: 'Home Assistant Zigbee and Thread radio adapter.',
      },
    ]

    for (const product of infrastructureProducts) {
      const manufacturerId = await getManufacturerId(product.manufacturerSlug)

      await db
        .insert(products)
        .values({
          slug: product.slug,
          name: product.name,
          manufacturerId,
          model: product.model,
          categoryId: gatewaysCategoryId,
          primaryProtocol: product.primaryProtocol,
          productRole: 'infrastructure',
          description: product.description,
          status: 'published',
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            name: product.name,
            manufacturerId,
            model: product.model,
            categoryId: gatewaysCategoryId,
            primaryProtocol: product.primaryProtocol,
            productRole: 'infrastructure',
            description: product.description,
            status: 'published',
            updatedAt: new Date(),
          },
        })
    }

    const hardwareSupportData = [
      {
        integrationSlug: 'zigbee2mqtt',
        productSlug: 'sonoff-zbdongle-p',
        requirementType: 'supported' as const,
        notes: 'Common coordinator option for Zigbee2MQTT.',
      },
      {
        integrationSlug: 'zha',
        productSlug: 'skyconnect',
        requirementType: 'supported' as const,
        notes: 'Official Home Assistant radio hardware.',
      },
    ]

    const getProductId = async (slug: string) => {
      const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1)
      return product?.id || null
    }

    for (const support of hardwareSupportData) {
      const integrationId = await getIntegrationId(support.integrationSlug)
      const productId = await getProductId(support.productSlug)

      if (!integrationId || !productId) continue

      await db
        .insert(integrationHardwareSupport)
        .values({
          integrationId,
          productId,
          requirementType: support.requirementType,
          notes: support.notes,
        })
        .onConflictDoUpdate({
          target: [integrationHardwareSupport.integrationId, integrationHardwareSupport.productId],
          set: {
            requirementType: support.requirementType,
            notes: support.notes,
            updatedAt: new Date(),
          },
        })
    }

    console.log(
      `✓ Seeded ${platformData.length} platforms, ${integrationData.length} integrations, ${commercialHubData.length} commercial hubs, and ${infrastructureProducts.length} infrastructure products`,
    )

    console.log('\n✨ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

seed()
