import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { create } from 'tar'

const pexec = promisify(execFile)

// A template whose .gitignore deliberately does NOT ignore .env, to prove the
// CLI adds the rule itself before committing.
async function fixtureTarball(): Promise<Uint8Array> {
  const src = await mkdtemp(join(tmpdir(), 'nsk-envcommit-src-'))
  const root = join(src, 'pkg-deadbeef')
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(join(root, 'src', 'main.ts'), 'app')
  await writeFile(join(root, '.gitignore'), 'node_modules\ndist\n') // no .env rule
  await writeFile(join(root, '.env.example'),
    'NODE_ENV=development\nJWT_SECRET=change_me_x\nJWT_REFRESH_SECRET=change_me_y\n')
  await writeFile(join(root, 'package.json'),
    JSON.stringify({ name: 'nestjs-starter-kit', version: '1.0.0', private: true }, null, 2))
  const chunks: Buffer[] = []
  await new Promise<void>((res, rej) =>
    create({ gzip: true, cwd: src }, ['pkg-deadbeef'])
      .on('data', (c: Buffer) => chunks.push(c)).on('end', res).on('error', rej))
  await rm(src, { recursive: true, force: true })
  return new Uint8Array(Buffer.concat(chunks))
}

const exists = (p: string) => access(p).then(() => true, () => false)

describe('.env is never committed', () => {
  let workdir: string
  let origCwd: string

  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'nsk-envcommit-'))
    origCwd = process.cwd()
    process.chdir(workdir)
    const tarball = await fixtureTarball()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(tarball as unknown as BodyInit, { status: 200 })))
  })

  afterEach(async () => {
    process.chdir(origCwd)
    process.exitCode = 0
    vi.unstubAllGlobals()
    await rm(workdir, { recursive: true, force: true })
  })

  it('adds a .gitignore rule so the generated .env is not tracked', async () => {
    const { run } = await import('../src/cli.js')
    await run(['my-app', '--no-install', '--no-docker'])

    const dir = join(workdir, 'my-app')
    expect(await exists(join(dir, '.env'))).toBe(true) // .env was generated

    const { stdout } = await pexec('git', ['-C', dir, 'ls-files'])
    const tracked = stdout.split('\n').map((l) => l.trim())
    expect(tracked).not.toContain('.env')     // …but never committed
    expect(tracked).toContain('.gitignore')
  })
})
