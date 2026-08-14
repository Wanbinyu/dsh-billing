/**
 * Generate the built-in price catalog (`src/catalog.ts`) from an installed
 * pi-ai model catalog. Every entry pi-ai ships with a cost record becomes a
 * catalog row keyed by `provider/model`; entries whose prices are all zero
 * are pi-ai's "unknown" markers (all-zero or negative prices such as the
 * openrouter/auto sentinel) and are deliberately excluded so those models
 * surface through the plugin's unpriced-model warning instead of billing at
 * zero silently.
 *
 * Usage:
 *   node scripts/generate-catalog.mjs [pi-ai-data-dir]
 * Defaults to the pi-ai data directory installed beside this package
 * (`@earendil-works/pi-ai`), or \$PI_AI_DATA_DIR.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const defaultDataDir = resolve(here, '..', 'node_modules', '@earendil-works', 'pi-ai', 'dist', 'providers', 'data')
const dataDir = process.argv[2] ?? process.env.PI_AI_DATA_DIR ?? defaultDataDir

const files = readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== '.manifest.json')
const catalog = {}
let total = 0
let priced = 0
let skippedZero = 0
for (const f of files) {
  const data = JSON.parse(readFileSync(join(dataDir, f), 'utf8'))
  for (const apiObject of Object.values(data)) {
    for (const [id, def] of Object.entries(apiObject)) {
      total++
      const cost = def?.cost
      const isUnknown = cost === undefined
        || (cost.input === 0 && cost.output === 0 && (cost.cacheRead ?? 0) === 0 && (cost.cacheWrite ?? 0) === 0)
        || cost.input < 0 || cost.output < 0 || (cost.cacheRead ?? 0) < 0 || (cost.cacheWrite ?? 0) < 0
      if (isUnknown) {
        skippedZero++
        continue
      }
      const provider = def?.provider ?? f.replace(/\.json$/, '')
      ;(catalog[provider] ??= {})[id] = {
        input: cost.input,
        output: cost.output,
        cacheRead: cost.cacheRead ?? 0,
        cacheWrite: cost.cacheWrite ?? 0,
      }
      priced++
    }
  }
}

const providers = Object.keys(catalog).sort()
const lines = [
  '/**',
  ' * Built-in price catalog generated from an installed pi-ai model catalog',
  ' * (scripts/generate-catalog.mjs). Do not edit by hand — regenerate with',
  ' * `node scripts/generate-catalog.mjs`. Prices are USD per 1M tokens as pi-ai',
  ' * ships them; a deployment overrides any entry through the plugin Config.',
  ' */',
  'export interface CatalogEntry {',
  '  /** USD per 1M uncached input tokens. */',
  '  input: number',
  '  /** USD per 1M output tokens. */',
  '  output: number',
  '  /** USD per 1M cache-read tokens. */',
  '  cacheRead: number',
  '  /** USD per 1M cache-write tokens. */',
  '  cacheWrite: number',
  '}',
  '',
  '/** Provider/model → price table (nested by provider, then model id). */',
  'export const BUILTIN_CATALOG: Record<string, Record<string, CatalogEntry>> = {',
  ...providers.map(provider => {
    const models = Object.keys(catalog[provider]).sort()
    const rows = models.map(id => '    ' + JSON.stringify(id) + ': { input: ' + catalog[provider][id].input + ', output: ' + catalog[provider][id].output + ', cacheRead: ' + catalog[provider][id].cacheRead + ', cacheWrite: ' + catalog[provider][id].cacheWrite + ' },')
    return ['  ' + JSON.stringify(provider) + ': {', ...rows, '  },']
  }).flat(),
  '}',
  '',
  '/** Number of priced catalog entries (regeneration sanity figure). */',
  'export const BUILTIN_CATALOG_SIZE = ' + priced,
  '',
  '/** Number of provider routes the catalog covers. */',
  'export const BUILTIN_CATALOG_PROVIDERS = ' + providers.length,
  '',
].join('\n')

const out = resolve(here, '..', 'src', 'catalog.ts')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, lines)
console.log('catalog written: ' + out)
console.log('entries: ' + priced + ' priced / ' + total + ' total (skipped ' + skippedZero + ' zero-price)')
console.log('providers: ' + providers.length)
