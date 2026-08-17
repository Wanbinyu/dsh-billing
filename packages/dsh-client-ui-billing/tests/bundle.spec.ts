import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function firstLine(path: URL): Promise<string> {
  return (await readFile(path, 'utf8')).split(/\r?\n/, 1)[0] ?? ''
}

describe('client bundle registration', () => {
  it('registers the standalone package under its own module id', async () => {
    await expect(firstLine(new URL('../lib/client.js', import.meta.url)))
      .resolves.toContain('id: "dsh-client-ui-billing"')
  })

  it('registers the root bundle under the exported package id', async () => {
    const rootPackage = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'))
    expect(rootPackage.exports['./client'].default)
      .toBe('./packages/dsh-client-ui-billing/lib/community-client.js')
    await expect(firstLine(new URL('../lib/community-client.js', import.meta.url)))
      .resolves.toContain('id: "dsh-billing-community-bundle"')
  })
})
