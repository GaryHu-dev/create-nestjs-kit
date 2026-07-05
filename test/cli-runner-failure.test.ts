import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, access, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { create } from 'tar'

async function fixtureTarball(): Promise<Uint8Array> {
  const src = await mkdtemp(join(tmpdir(), 'nsk-runner-src-'))
  const root = join(src, 'pkg-deadbeef')
  await mkdir(join(root, 'src'), { recursive: true })
  await mkdir(join(root, 'docs'), { recursive: true })
  await writeFile(join(root, 'src', 'main.ts'), 'app')
  await writeFile(join(root, 'docs', 'contributing.md'), 'x')
  await writeFile(join(root, 'LICENSE'), 'mit')
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

vi.mock('../src/runners.js', async () => {
  const actual = await vi.importActual<typeof import('../src/runners.js')>('../src/runners.js')
  return {
    ...actual,
    commandExists: vi.fn(async () => true),
    runInstall: vi.fn(async () => {
      throw new Error('simulated pnpm install failure')
    }),
  }
})

describe('runner failure does not delete the scaffold', () => {
  let workdir: string
  let origCwd: string

  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'nsk-runner-'))
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

  it('leaves the scaffold intact when install fails', async () => {
    const { run } = await import('../src/cli.js')
    await run(['my-app', '--install', '--no-docker'])

    const dir = join(workdir, 'my-app')
    expect(await exists(dir)).toBe(true)
    expect(await exists(join(dir, 'package.json'))).toBe(true)
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-app')
    expect(process.exitCode ?? 0).toBeFalsy()
  })
})
