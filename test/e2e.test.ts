import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, readFile, access, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { create } from 'tar'
import { run } from '../src/cli.js'

async function fixtureTarball(): Promise<Uint8Array> {
  const src = await mkdtemp(join(tmpdir(), 'nsk-e2e-src-'))
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

describe('e2e scaffold', () => {
  let workdir: string
  let origCwd: string

  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'nsk-e2e-'))
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

  it('scaffolds a project with rewritten package.json, .env, and one commit', async () => {
    await run(['my-app', '--no-install', '--no-docker'])
    expect(process.exitCode ?? 0).toBe(0)

    const dir = join(workdir, 'my-app')
    // package.json rewritten
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-app')
    expect(pkg.version).toBe('0.0.0')
    expect(pkg.license).toBe('UNLICENSED')

    // .env generated with real secrets
    const env = await readFile(join(dir, '.env'), 'utf8')
    expect(env).not.toContain('change_me')

    // excludes applied
    expect(await exists(join(dir, 'LICENSE'))).toBe(false)
    expect(await exists(join(dir, 'docs', 'contributing.md'))).toBe(false)

    // README regenerated
    expect(await readFile(join(dir, 'README.md'), 'utf8')).toMatch(/^# my-app/m)

    // one git commit
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const pexec = promisify(execFile)
    const { stdout } = await pexec('git', ['-C', dir, 'rev-list', '--count', 'HEAD'])
    expect(stdout.trim()).toBe('1')
  })
})
