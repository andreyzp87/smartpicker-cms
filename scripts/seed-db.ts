import { db } from '../src/db/client'
import { manufacturers, categories, hubs } from '../src/db/schema'

async function seed() {
  console.log('Seeding database...')

  // Seed manufacturers
  await db.insert(manufacturers).values([
    { slug: 'philips', name: 'Philips', website: 'https://www.philips.com' },
    { slug: 'ikea', name: 'IKEA', website: 'https://www.ikea.com' },
    { slug: 'aqara', name: 'Aqara', website: 'https://www.aqara.com' },
    { slug: 'sonoff', name: 'Sonoff', website: 'https://sonoff.tech' },
  ])

  // Seed categories
  await db.insert(categories).values([
    { slug: 'lighting', name: 'Lighting', sortOrder: 1 },
    { slug: 'sensors', name: 'Sensors', sortOrder: 2 },
    { slug: 'switches', name: 'Switches', sortOrder: 3 },
    { slug: 'climate', name: 'Climate', sortOrder: 4 },
    { slug: 'security', name: 'Security', sortOrder: 5 },
  ])

  // Seed hubs
  await db.insert(hubs).values([
    {
      slug: 'home-assistant',
      name: 'Home Assistant',
      protocolsSupported: ['zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'],
      description: 'Open source home automation platform',
    },
    {
      slug: 'smartthings',
      name: 'SmartThings',
      protocolsSupported: ['zigbee', 'zwave', 'matter', 'wifi'],
      description: 'Samsung SmartThings hub',
    },
  ])

  console.log('Seeding complete!')
}

seed().catch(console.error)
