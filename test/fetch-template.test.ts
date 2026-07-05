import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { create } from 'tar'
import { extractTarball } from '../src/fetch-template.js'

async function makeFixtureTarball(): Promise<Uint8Array> {
  // Build a temp source tree wrapped in "pkg-abc123/", tar+gzip it, return bytes.
  const src = await mkdtemp(join(tmpdir(), 'nsk-src-'))
  const root = join(src, 'pkg-abc123')
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir(join(root, '.github', 'workflows'), { recursive: true })
  await mkdir(join(root, 'docs'), { recursive: true })
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'ci')
  await writeFile(join(root, 'docs', 'contributing.md'), 'contrib')
  await writeFile(join(root, 'docs', 'architecture.md'), 'arch')
  await writeFile(join(root, 'LICENSE'), 'mit')
  await writeFile(join(root, 'src', 'main.ts'), 'app')
  await writeFile(join(root, 'package.json'), '{}')

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    create({ gzip: true, cwd: src }, ['pkg-abc123'])
      .on('data', (c: Buffer) => chunks.push(c))
      .on('end', resolve)
      .on('error', reject)
  })
  await rm(src, { recursive: true, force: true })
  return new Uint8Array(Buffer.concat(chunks))
}

const exists = (p: string) => access(p).then(() => true, () => false)

describe('extractTarball', () => {
  let dest: string
  beforeEach(async () => { dest = await mkdtemp(join(tmpdir(), 'nsk-out-')) })
  afterEach(async () => { await rm(dest, { recursive: true, force: true }) })

  it('strips the wrapper dir and applies the exclude list', async () => {
    const tarball = await makeFixtureTarball()
    await extractTarball(tarball, dest)

    // wrapper stripped: files land at dest root
    expect(await readFile(join(dest, 'package.json'), 'utf8')).toBe('{}')
    expect(await readFile(join(dest, 'src', 'main.ts'), 'utf8')).toBe('app')
    expect(await readFile(join(dest, 'docs', 'architecture.md'), 'utf8')).toBe('arch')

    // excluded
    expect(await exists(join(dest, '.github'))).toBe(false)
    expect(await exists(join(dest, '.github', 'workflows', 'ci.yml'))).toBe(false)
    expect(await exists(join(dest, 'docs', 'contributing.md'))).toBe(false)
    expect(await exists(join(dest, 'LICENSE'))).toBe(false)
  })
})
