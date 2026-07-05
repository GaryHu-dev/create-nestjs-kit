import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { create } from 'tar'
import { fetchTemplate, extractTarball, assertExcludesAbsent } from '../src/fetch-template.js'

// A minimal GitHub-shaped tarball (single wrapper dir) for the happy path.
async function fixtureTarball(paths: Record<string, string>): Promise<Buffer> {
  const src = await mkdtemp(join(tmpdir(), 'nsk-net-src-'))
  const root = join(src, 'pkg-abc123')
  for (const [rel, content] of Object.entries(paths)) {
    const full = join(root, rel)
    await mkdir(join(full, '..'), { recursive: true })
    await writeFile(full, content)
  }
  const chunks: Buffer[] = []
  await new Promise<void>((res, rej) =>
    create({ gzip: true, cwd: src }, ['pkg-abc123'])
      .on('data', (c: Buffer) => chunks.push(c)).on('end', res).on('error', rej))
  await rm(src, { recursive: true, force: true })
  return Buffer.concat(chunks)
}

describe('fetchTemplate network handling', () => {
  let dest: string
  beforeEach(async () => { dest = await mkdtemp(join(tmpdir(), 'nsk-net-'))})
  afterEach(async () => { vi.unstubAllGlobals(); await rm(dest, { recursive: true, force: true }) })

  it('throws a clear error naming the status on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    await expect(fetchTemplate(dest, 'https://example.test/x.tgz')).rejects.toThrow(/404/)
  })

  it('wraps a raw network failure in an Error naming the url', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(fetchTemplate(dest, 'https://example.test/x.tgz'))
      .rejects.toThrow(/example\.test\/x\.tgz/)
  })
})

describe('extractTarball leak guard', () => {
  let dest: string
  beforeEach(async () => { dest = await mkdtemp(join(tmpdir(), 'nsk-leak-'))})
  afterEach(async () => { await rm(dest, { recursive: true, force: true }) })

  it('extracts a clean tree without complaint', async () => {
    const tarball = await fixtureTarball({ 'src/main.ts': 'app', 'package.json': '{}' })
    await expect(extractTarball(new Uint8Array(tarball), dest)).resolves.toBeUndefined()
  })

  it('throws if an excluded path is present after extraction', async () => {
    // Simulate the filter being bypassed: an excluded path exists on disk.
    await mkdir(join(dest, '.github', 'workflows'), { recursive: true })
    expect(() => assertExcludesAbsent(dest)).toThrow(/leaked/)
  })

  it('passes when no excluded path is present', async () => {
    await mkdir(join(dest, 'src'), { recursive: true })
    expect(() => assertExcludesAbsent(dest)).not.toThrow()
  })
})
