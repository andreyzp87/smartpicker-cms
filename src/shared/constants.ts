export const PROTOCOLS = {
  zigbee: { name: 'Zigbee', color: 'yellow' },
  zwave: { name: 'Z-Wave', color: 'blue' },
  matter: { name: 'Matter', color: 'purple' },
  wifi: { name: 'WiFi', color: 'green' },
  thread: { name: 'Thread', color: 'orange' },
  bluetooth: { name: 'Bluetooth', color: 'cyan' },
} as const

export const PRODUCT_STATUSES = {
  draft: { name: 'Draft', color: 'gray' },
  published: { name: 'Published', color: 'green' },
  archived: { name: 'Archived', color: 'red' },
} as const

export const COMPATIBILITY_STATUSES = {
  verified: { name: 'Verified', color: 'green' },
  reported: { name: 'Reported', color: 'blue' },
  untested: { name: 'Untested', color: 'gray' },
  incompatible: { name: 'Incompatible', color: 'red' },
} as const
