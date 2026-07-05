import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from '../src/cli.js'

describe('cleanup safety', () => {
  let workdir: string
  let origCwd: string

  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'nsk-cleanup-'))
    origCwd = process.cwd()
    process.chdir(workdir)
    // fetch fails → triggers the error/cleanup path in run()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )
  })

  afterEach(async () => {
    process.chdir(origCwd)
    vi.unstubAllGlobals()
    await rm(workdir, { recursive: true, force: true })
  })

  it('does not delete a pre-existing --force target on failure', async () => {
    const target = join(workdir, 'existing')
    await mkdir(target, { recursive: true })
    await writeFile(join(target, 'notes.txt'), 'important')

    process.exitCode = 0
    await run(['existing', '--force', '--no-install', '--no-docker'])

    // the pre-existing dir and its file must survive
    expect(await readFile(join(target, 'notes.txt'), 'utf8')).toBe('important')
    process.exitCode = 0 // reset so a set exitCode doesn't fail the runner
  })

  it('does remove a freshly-created dir on failure', async () => {
    const target = join(workdir, 'brand-new')

    process.exitCode = 0
    await run(['brand-new', '--no-install', '--no-docker'])

    // the freshly-created dir should have been cleaned up on failure
    await expect(access(target)).rejects.toThrow()
    process.exitCode = 0
  })
})
