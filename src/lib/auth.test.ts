import { describe, expect, it } from 'vitest'
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  verifyPassword,
} from './auth'

describe('auth helpers', () => {
  it('normalizes emails consistently', () => {
    expect(normalizeEmail('  ADMIN@Example.COM ')).toBe('admin@example.com')
  })

  it('hashes and verifies passwords', async () => {
    const password = 'correct horse battery staple'
    const hash = await hashPassword(password)

    expect(hash).toMatch(/^scrypt:/)
    await expect(verifyPassword(password, hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('rejects malformed password hashes', async () => {
    await expect(verifyPassword('password', 'not-a-valid-hash')).resolves.toBe(false)
  })

  it('creates stable session token hashes', () => {
    const token = createSessionToken()

    expect(token.length).toBeGreaterThan(10)
    expect(hashSessionToken(token)).toHaveLength(64)
    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
  })
})
