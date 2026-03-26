import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalStorageDriver } from './local.driver'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await import('node:fs/promises').then(({ rm }) => rm(dir, { recursive: true, force: true }))
    }),
  )
})

async function createDriver() {
  const basePath = await mkdtemp(path.join(os.tmpdir(), 'smartpicker-storage-'))
  tempDirs.push(basePath)

  return new LocalStorageDriver({
    basePath,
    publicUrlBase: '/exports',
  })
}

describe('LocalStorageDriver', () => {
  it('writes pretty-printed json and returns the public url', async () => {
    const driver = await createDriver()
    const url = await driver.write('products/test.json', { foo: 'bar' })

    const filePath = path.join(tempDirs[0], 'products/test.json')
    const content = await readFile(filePath, 'utf-8')

    expect(url).toBe('/exports/products/test.json')
    expect(content).toContain('\n  "foo": "bar"\n')
  })

  it('lists and deletes files under the configured base path', async () => {
    const driver = await createDriver()

    await driver.write('products/a.json', { a: 1 })
    await driver.write('products/b.json', { b: 2 })

    await expect(driver.list('products')).resolves.toEqual(['products/a.json', 'products/b.json'])

    await driver.delete('products/a.json')

    await expect(driver.exists('products/a.json')).resolves.toBe(false)
    await expect(driver.exists('products/b.json')).resolves.toBe(true)
  })

  it('rejects storage keys that escape the base path', async () => {
    const driver = await createDriver()

    await expect(driver.write('../outside.json', { nope: true })).rejects.toThrow(
      'Storage key resolves outside configured base path',
    )
  })
})
